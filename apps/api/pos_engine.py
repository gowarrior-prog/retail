from pydantic import BaseModel, Field
from typing import List, Optional

class POSOrderItem(BaseModel):
    product_id: str
    product_name: str
    price: float
    cost_price: float = 0.0
    quantity: int = 1
    discount_percentage: float = 0.0

class POSCheckoutRequest(BaseModel):
    store_id: Optional[str] = None
    cashier_name: Optional[str] = "Main Cashier"
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    payment_mode: str = "CASH" # CASH, BANK, CREDIT_KHATA
    tax_percentage: float = 0.0
    amount_paid: float
    items: List[POSOrderItem]

class POSCheckoutResponse(BaseModel):
    invoice_number: str
    subtotal: float
    discount_total: float
    tax_total: float
    grand_total: float
    amount_paid: float
    change_returned: float
    khata_added_balance: float
    total_profit: float
    payment_mode: str

def calculate_pos_receipt(request: POSCheckoutRequest) -> dict:
    """
    Computes complete POS Counter financial receipt:
    - Item Line Totals
    - Discounts
    - Tax
    - Profit Margin
    - Change Returned
    - Khata Outstanding Credit
    """
    subtotal = 0.0
    discount_total = 0.0
    total_cost = 0.0

    for item in request.items:
        line_subtotal = item.price * item.quantity
        line_discount = line_subtotal * (item.discount_percentage / 100.0)
        line_cost = item.cost_price * item.quantity

        subtotal += line_subtotal
        discount_total += line_discount
        total_cost += line_cost

    net_after_discount = subtotal - discount_total
    tax_total = net_after_discount * (request.tax_percentage / 100.0)
    grand_total = round(net_after_discount + tax_total, 2)
    
    total_profit = round(net_after_discount - total_cost, 2)

    change_returned = 0.0
    khata_added_balance = 0.0

    if request.payment_mode.upper() == "CREDIT_KHATA":
        # Outstanding credit added to customer khata ledger
        khata_added_balance = max(0.0, grand_total - request.amount_paid)
        change_returned = max(0.0, request.amount_paid - grand_total)
    else:
        change_returned = max(0.0, request.amount_paid - grand_total)

    return {
        "subtotal": round(subtotal, 2),
        "discount_total": round(discount_total, 2),
        "tax_total": round(tax_total, 2),
        "grand_total": grand_total,
        "amount_paid": round(request.amount_paid, 2),
        "change_returned": round(change_returned, 2),
        "khata_added_balance": round(khata_added_balance, 2),
        "total_profit": total_profit
    }
