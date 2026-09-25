"""Diagnose Speed-X 80mm printer connection and port."""
import win32print

print("=" * 50)
print("PRINTER DIAGNOSTICS")
print("=" * 50)

# List all printers with details
printers = win32print.EnumPrinters(
    win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS, None, 2
)

for p in printers:
    name = p['pPrinterName']
    port = p.get('pPortName', '?')
    driver = p.get('pDriverName', '?')
    status = p.get('Status', 0)
    jobs = p.get('cJobs', 0)
    print(f"\nPrinter: {name}")
    print(f"  Port: {port}")
    print(f"  Driver: {driver}")
    print(f"  Status Code: {status}")
    print(f"  Jobs in Queue: {jobs}")

print("\n" + "=" * 50)
print("DEFAULT PRINTER:", win32print.GetDefaultPrinter())

# Check Speed-X specifically
target = "Speed-X 80mm Bill Printer"
print(f"\n{'=' * 50}")
print(f"TESTING: {target}")
print("=" * 50)

try:
    h = win32print.OpenPrinter(target)
    info = win32print.GetPrinter(h, 2)
    print(f"  Port: {info['pPortName']}")
    print(f"  Driver: {info['pDriverName']}")
    print(f"  Status: {info['Status']}")
    print(f"  Jobs: {info['cJobs']}")
    print(f"  Share: {info.get('pShareName', 'N/A')}")
    print(f"  Location: {info.get('pLocation', 'N/A')}")
    
    # Check jobs in queue
    jobs = win32print.EnumJobs(h, 0, 100, 1)
    if jobs:
        print(f"\n  STUCK JOBS IN QUEUE ({len(jobs)}):")
        for j in jobs:
            print(f"    Job #{j['JobId']}: {j['pDocument']} - Status: {j['Status']} - Pages: {j.get('TotalPages', '?')}")
    else:
        print("\n  No jobs in queue (queue is empty)")
    
    win32print.ClosePrinter(h)
except Exception as e:
    print(f"  ERROR: {e}")

# Also check Generic / Text Only
target2 = "Generic / Text Only"
print(f"\n{'=' * 50}")
print(f"TESTING: {target2}")
print("=" * 50)
try:
    h2 = win32print.OpenPrinter(target2)
    info2 = win32print.GetPrinter(h2, 2)
    print(f"  Port: {info2['pPortName']}")
    print(f"  Driver: {info2['pDriverName']}")
    print(f"  Status: {info2['Status']}")
    print(f"  Jobs: {info2['cJobs']}")
    jobs2 = win32print.EnumJobs(h2, 0, 100, 1)
    if jobs2:
        print(f"\n  STUCK JOBS ({len(jobs2)}):")
        for j in jobs2:
            print(f"    Job #{j['JobId']}: {j['pDocument']} - Status: {j['Status']}")
    win32print.ClosePrinter(h2)
except Exception as e:
    print(f"  ERROR: {e}")
