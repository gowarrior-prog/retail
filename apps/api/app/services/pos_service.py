from pydantic import BaseModel
from typing import List, Optional

class POSOrderItem(BaseModel):
    product_id: Optional[str] = "item-1"
    product_name: Optional[str] = "Fabric Item"
    price: Optional[float] = 0.0
    unit_price: Optional[float] = None
    cost_price: Optional[float] = 0.0
    quantity: int = 1
    discount_percentage: Optional[float] = 0.0

    def get_price(self) -> float:
        if self.unit_price is not None and self.unit_price > 0:
            return self.unit_price
        return self.price or 0.0

class POSCheckoutRequest(BaseModel):
    store_id: Optional[str] = None
    cashier_name: Optional[str] = "Admin"
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    payment_mode: str = "CASH" # CASH, BANK, CREDIT_KHATA
    tax_percentage: Optional[float] = 0.0
    amount_paid: Optional[float] = None
    amount_tendered: Optional[float] = None
    items: List[POSOrderItem]

    def get_amount_paid(self) -> float:
        if self.amount_paid is not None:
            return self.amount_paid
        if self.amount_tendered is not None:
            return self.amount_tendered
        return 0.0

def calculate_pos_receipt(request: POSCheckoutRequest) -> dict:
    subtotal = 0.0
    discount_total = 0.0
    total_cost = 0.0
    amount_paid = request.get_amount_paid()

    for item in request.items:
        price = item.get_price()
        disc_pct = item.discount_percentage or 0.0
        cost = item.cost_price or 0.0

        line_subtotal = price * item.quantity
        line_discount = line_subtotal * (disc_pct / 100.0)
        line_cost = cost * item.quantity

        subtotal += line_subtotal
        discount_total += line_discount
        total_cost += line_cost

    net_after_discount = subtotal - discount_total
    tax_total = net_after_discount * ((request.tax_percentage or 0.0) / 100.0)
    grand_total = round(net_after_discount + tax_total, 2)
    
    total_profit = round(net_after_discount - total_cost, 2)

    change_returned = 0.0
    khata_added_balance = 0.0

    if request.payment_mode.upper() == "CREDIT_KHATA":
        khata_added_balance = max(0.0, grand_total - amount_paid)
        change_returned = max(0.0, amount_paid - grand_total)
    else:
        change_returned = max(0.0, amount_paid - grand_total)

    return {
        "subtotal": round(subtotal, 2),
        "discount_total": round(discount_total, 2),
        "tax_total": round(tax_total, 2),
        "grand_total": grand_total,
        "amount_paid": round(amount_paid, 2),
        "change_returned": round(change_returned, 2),
        "khata_added_balance": round(khata_added_balance, 2),
        "total_profit": total_profit
    }
