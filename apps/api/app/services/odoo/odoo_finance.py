import os
import uuid
import json
from sqlalchemy.future import select
from app.core.database import SessionDb2, SessionDb3
from app.models.db2_operations import EmployeeModel
from app.models.db3_finance import CustomerKhataModel, ShopPurchaseModel, BillingHistoryModel
from app.services.sqlite_sync_service import save_bill_locally
from app.services.odoo.odoo_client import ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASS, json_rpc

async def sync_odoo_employees() -> dict:
    """Syncs staff and employee records from Odoo (hr.employee) into DB2 Operations."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": "Odoo authentication failed.", "synced": 0}
        uid = auth_res.get("result")

        emp_res = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "hr.employee", "search_read", [[]],
            {"fields": ["id", "name", "work_phone", "mobile_phone", "job_title", "identification_id"], "limit": 200}
        ], timeout=10)
        
        employees_data = emp_res.get("result", []) if isinstance(emp_res, dict) and emp_res.get("result") is not None else []
        
        synced_count = 0
        async with SessionDb2() as db2:
            res_all = await db2.execute(select(EmployeeModel))
            existing_emps = {e.phone: e for e in res_all.scalars().all() if e.phone}

            for emp in employees_data:
                name = str(emp.get("name") or "Staff Member")
                raw_phone = emp.get("mobile_phone") or emp.get("work_phone")
                phone = str(raw_phone).strip() if raw_phone and str(raw_phone).strip() != "False" else ""
                job = str(emp.get("job_title") or "SALES_EXECUTIVE")
                db_phone = phone if phone else f"EMP-{emp.get('id')}"

                existing = existing_emps.get(db_phone)
                if existing:
                    existing.name = name
                    existing.role = job
                else:
                    new_emp = EmployeeModel(
                        id=str(uuid.uuid4()), name=name, phone=db_phone, role=job, base_salary=35000.0
                    )
                    db2.add(new_emp)
                    existing_emps[db_phone] = new_emp
                synced_count += 1
            await db2.commit()

        return {"status": "success", "message": f"Synced {synced_count} employees from Odoo!", "synced": synced_count}
    except Exception as e:
        return {"status": "error", "message": f"Odoo Employee Sync notice: {str(e)}"}

async def sync_odoo_khata() -> dict:
    """Syncs Khata/Customer receivables from Odoo (res.partner) into DB3 Finance."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": "Odoo authentication failed.", "synced": 0}
        uid = auth_res.get("result")

        partners_res = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "res.partner", "search_read", [[]],
            {"fields": ["id", "name", "phone", "mobile", "credit", "debit", "total_due"], "limit": 500}
        ], timeout=15)

        partners = partners_res.get("result", []) if isinstance(partners_res, dict) and partners_res.get("result") is not None else []
        synced_count = 0
        async with SessionDb3() as db3:
            res_all = await db3.execute(select(CustomerKhataModel))
            existing_khatas = {k.phone: k for k in res_all.scalars().all() if k.phone}

            for p in partners:
                name = str(p.get("name") or "Khata Customer")
                raw_phone = p.get("mobile") or p.get("phone")
                phone = str(raw_phone).strip() if raw_phone and str(raw_phone).strip() != "False" else ""
                balance = float(p.get("credit") or p.get("total_due") or p.get("debit") or 0.0)
                db_phone = phone if phone else f"CUST-{p.get('id')}"

                existing = existing_khatas.get(db_phone)
                if existing:
                    existing.customer_name = name
                    existing.total_balance = balance
                else:
                    new_khata = CustomerKhataModel(id=str(uuid.uuid4()), customer_name=name, phone=db_phone, total_balance=balance)
                    db3.add(new_khata)
                    existing_khatas[db_phone] = new_khata
                synced_count += 1
            await db3.commit()

        return {"status": "success", "message": f"Synced {synced_count} Khata customer records from Odoo!", "synced": synced_count}
    except Exception as e:
        return {"status": "error", "message": f"Odoo Khata Sync notice: {str(e)}"}

async def sync_odoo_purchases() -> dict:
    """Syncs Purchase orders from Odoo (purchase.order) into DB3 Finance."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": "Odoo authentication failed.", "synced": 0}
        uid = auth_res.get("result")

        po_res = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "purchase.order", "search_read", [[]],
            {"fields": ["id", "name", "partner_id", "amount_total", "state"], "limit": 200}
        ], timeout=15)

        orders = po_res.get("result", []) if isinstance(po_res, dict) and po_res.get("result") is not None else []
        synced_count = 0
        async with SessionDb3() as db3:
            for po in orders:
                supplier = po.get("partner_id")
                supplier_name = supplier[1] if isinstance(supplier, (list, tuple)) and len(supplier) > 1 else "Odoo Vendor"
                item_name = str(po.get("name") or "Fabric Stock Purchase")
                total_cost = float(po.get("amount_total") or 0.0)
                paid = total_cost if po.get("state") == "purchase" else 0.0

                new_purchase = ShopPurchaseModel(
                    id=str(uuid.uuid4()), supplier_name=supplier_name, item_name=item_name,
                    quantity=1, total_cost=total_cost, paid_amount=paid, remaining=max(0.0, total_cost - paid),
                    notes=f"Synced from Odoo PO #{po.get('id')}"
                )
                db3.add(new_purchase)
                synced_count += 1
            await db3.commit()

        return {"status": "success", "message": f"Synced {synced_count} Purchase orders from Odoo!", "synced": synced_count}
    except Exception as e:
        return {"status": "error", "message": f"Odoo Purchase Sync notice: {str(e)}"}

async def sync_odoo_orders() -> dict:
    """Syncs Sales History & POS Invoices from Odoo ERP into DB3 Finance and SQLite."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": "Odoo authentication failed.", "synced": 0}
        uid = auth_res.get("result")

        pos_orders = []
        try:
            res = json_rpc(rpc_url, "object", "execute_kw", [
                ODOO_DB, uid, ODOO_PASS, "pos.order", "search_read", [[]],
                {"fields": ["id", "name", "pos_reference", "partner_id", "amount_total", "amount_tax", "date_order"], "limit": 500}
            ], timeout=15)
            pos_orders = res.get("result", []) if isinstance(res, dict) and res.get("result") is not None else []
        except Exception:
            pass

        orders_to_sync = pos_orders
        synced_count = 0

        async with SessionDb3() as db3:
            res_all = await db3.execute(select(BillingHistoryModel))
            existing_invoices = {b.invoice_number for b in res_all.scalars().all() if b.invoice_number}

            for ord_item in orders_to_sync:
                inv_name = str(ord_item.get("pos_reference") or ord_item.get("name") or f"INV-ODOO-{ord_item.get('id')}")
                if inv_name in existing_invoices:
                    continue

                customer = ord_item.get("partner_id")
                customer_name = customer[1] if isinstance(customer, (list, tuple)) and len(customer) > 1 else "Walk-in Customer"
                total_amt = float(ord_item.get("amount_total") or 0.0)
                tax_amt = float(ord_item.get("amount_tax") or 0.0)
                items_json = json.dumps([{"product_name": f"Odoo Order #{ord_item.get('id')}", "quantity": 1, "unit_price": total_amt, "total_price": total_amt}])

                try:
                    save_bill_locally(invoice_number=inv_name, customer_phone=customer_name, total_amount=total_amt, discount=0.0, tax=tax_amt, payment_mode="CASH", cashier_name="Odoo POS", item_details_json=items_json)
                except Exception:
                    pass

                record = BillingHistoryModel(id=str(uuid.uuid4()), invoice_number=inv_name, customer_phone=customer_name, total_amount=total_amt, discount=0.0, tax=tax_amt, payment_mode="CASH", cashier_name="Odoo POS", item_details_json=items_json)
                db3.add(record)
                existing_invoices.add(inv_name)
                synced_count += 1

            await db3.commit()

        return {"status": "success", "message": f"Synced {synced_count} Sales History records from Odoo!", "synced": synced_count}
    except Exception as e:
        return {"status": "error", "message": f"Odoo Sales Sync notice: {str(e)}"}
