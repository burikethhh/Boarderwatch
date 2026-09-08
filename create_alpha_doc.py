import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_boarderswatch_alpha():
    doc = docx.Document('ALPHA T.docx')
    
    # 1. Update Title P5 and P6
    p5 = doc.paragraphs[5]
    p5.clear()
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_p5 = p5.add_run("ALPHA TESTING EVALUATION SHEET")
    r_p5.bold = True
    r_p5.font.name = "Arial"
    r_p5.font.size = Pt(14)

    p6 = doc.paragraphs[6]
    p6.clear()
    p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_label = p6.add_run("Project Title: ")
    run_label.bold = True
    run_label.font.name = "Arial"
    run_label.font.size = Pt(11)
    
    run_title = p6.add_run("BOARDERSWATCH: WEB-BASED BOARDING HOUSE MANAGEMENT SYSTEM WITH INTEGRATED CCTV MONITORING FOR DAY N EARTH LUCERO BOARDING HOUSE")
    run_title.bold = True
    run_title.font.name = "Arial"
    run_title.font.size = Pt(11)
    
    # Check P7 (Institution)
    p7 = doc.paragraphs[7]
    p7.clear()
    run_inst_lbl = p7.add_run("Institution: ")
    run_inst_lbl.bold = True
    run_inst_lbl.font.name = "Arial"
    run_inst = p7.add_run("Southern Mindanao Institute of Technology, Inc. (SMIT)")
    run_inst.font.name = "Arial"
    
    # 2. Prepare Module Test Cases for Table 0
    test_cases = [
        # Module 1: System Login & Authentication
        ("Module 1: User Authentication & Role Access", "System user login using valid credentials for Administrator and Staff accounts."),
        ("Module 1: User Authentication & Role Access", "System validates credentials against bcrypt-hashed passwords and generates secure JWT session token."),
        ("Module 1: User Authentication & Role Access", "System displays clear and informative error messages upon entering invalid username or password."),
        ("Module 1: User Authentication & Role Access", "System redirects user to the appropriate dashboard based on assigned role (Admin / Staff)."),
        ("Module 1: User Authentication & Role Access", "System enforces role-based access control (RBAC), preventing unauthorized access to protected routes."),
        ("Module 1: User Authentication & Role Access", "User logout securely invalidates the JWT session and redirects to the login screen."),
        
        # Module 2: Dashboard & Overview
        ("Module 2: Dashboard & Analytics Overview", "Dashboard displays real-time summary metric cards: Total Tenants, Occupied Rooms, Pending Payments, and Unread Security Alerts."),
        ("Module 2: Dashboard & Analytics Overview", "Quick Action buttons provide one-click access to Add New Tenant, Record Payment, View CCTV, and Generate Report."),
        ("Module 2: Dashboard & Analytics Overview", "Recent Payments feed dynamically renders latest tenant transactions with tenant name, amount paid, and date."),
        ("Module 2: Dashboard & Analytics Overview", "Recent Notifications feed displays real-time security alerts and system events."),
        ("Module 2: Dashboard & Analytics Overview", "Responsive sidebar navigation provides seamless access across all system modules."),
        
        # Module 3: Tenant Management
        ("Module 3: Tenant Management", "User can view the complete directory of registered tenants with room numbers, contact info, and status."),
        ("Module 3: Tenant Management", "User can search tenants by name or room and filter tenant list by status (Active, Inactive, Evicted)."),
        ("Module 3: Tenant Management", "User can register a new tenant with personal info, contact numbers, emergency contact person/phone, and document uploads."),
        ("Module 3: Tenant Management", "User can view comprehensive tenant profile details, emergency contact info, and active lease records."),
        ("Module 3: Tenant Management", "User can edit and update existing tenant profile information and contact details."),
        ("Module 3: Tenant Management", "User can export the tenant directory and master list into an Excel spreadsheet."),
        
        # Module 4: Room Management
        ("Module 4: Room Management", "Room Management displays summary status cards for Occupied Rooms, Vacant Rooms, Under Maintenance, and Occupancy Rate."),
        ("Module 4: Room Management", "Room Inventory table displays Room Number, Floor Level, Room Type (Single/Double), Bed Capacity, Monthly Rate, Status, and Amenities."),
        ("Module 4: Room Management", "User can add a new room specifying room number, floor, room type, bed capacity, monthly rental rate, and amenities."),
        ("Module 4: Room Management", "User can configure room amenities (WiFi, Air Conditioning, Private CR, Balcony)."),
        ("Module 4: Room Management", "User can edit room details, update rental rates, or toggle room maintenance status."),
        ("Module 4: Room Management", "System automatically updates room occupancy status (Vacant to Occupied / Occupied to Vacant) upon tenant assignment or move-out."),
        
        # Module 5: Lease Management
        ("Module 5: Lease Management", "Active Leases table displays Lease Number (e.g., LS-2025-001), Tenant Name, Assigned Room, Start Date, End Date, Monthly Rent, and Status."),
        ("Module 5: Lease Management", "User can create a new lease agreement by selecting tenant, assigning an available room, setting contract dates, and defining monthly rent."),
        ("Module 5: Lease Management", "System color-codes lease status badges (Active - Green, Expiring Soon - Orange, Expired - Red)."),
        ("Module 5: Lease Management", "System automatically detects leases nearing expiration and generates renewal reminder alerts."),
        ("Module 5: Lease Management", "User can renew an existing lease agreement or terminate/close a completed lease."),
        ("Module 5: Lease Management", "User can export lease agreement records and summary reports."),
        
        # Module 6: Payment Tracking & Billing
        ("Module 6: Payment Tracking & Billing", "Financial summary cards display Collected Amount, Pending Amount, Overdue Amount, and Collection Rate percentage."),
        ("Module 6: Payment Tracking & Billing", "Payment Records table displays Receipt Number (e.g., RCT-2025-006), Tenant Name, Amount, Date, Payment Type (Rent/Deposit/Utility), and Payment Method (Cash/Bank Transfer)."),
        ("Module 6: Payment Tracking & Billing", "User can record a new tenant payment transaction linked to an active lease agreement."),
        ("Module 6: Payment Tracking & Billing", "System automatically generates a unique digital receipt number and produces an official printable receipt layout."),
        ("Module 6: Payment Tracking & Billing", "System automatically calculates balance dues, updates overdue accounts, and reflects collections on dashboard metrics."),
        ("Module 6: Payment Tracking & Billing", "User can export payment transactions and collection analytics into Excel format."),
        
        # Module 7: CCTV Surveillance & Monitoring
        ("Module 7: CCTV Surveillance & Monitoring", "Multi-camera live grid displays real-time video streams connected via RTSP protocol and WebRTC/HLS streaming."),
        ("Module 7: CCTV Surveillance & Monitoring", "Live camera feeds display designated camera labels (e.g., CAM 1 - Main Entrance, CAM 2 - Hallway A), live indicator, REC badge, and timestamp."),
        ("Module 7: CCTV Surveillance & Monitoring", "System detects motion activity and triggers an immediate real-time alert banner at the top of the interface with camera ID and timestamp."),
        ("Module 7: CCTV Surveillance & Monitoring", "User can acknowledge and dismiss motion alerts, logging resolution status in the database."),
        ("Module 7: CCTV Surveillance & Monitoring", "User can toggle individual camera feeds to Full Screen mode for detailed security inspection."),
        ("Module 7: CCTV Surveillance & Monitoring", "User can initiate simultaneous recording ('Record All') across surveillance channels."),
        ("Module 7: CCTV Surveillance & Monitoring", "System monitors camera connectivity and indicates real-time online/offline health status for each camera unit."),
        
        # Module 8: Notifications & Alert Dispatch
        ("Module 8: Notifications & Alert Dispatch", "Chronological notification center displays alerts categorized with severity badges (CRITICAL, SECURITY, WARNING, INFO)."),
        ("Module 8: Notifications & Alert Dispatch", "System automatically dispatches SMS notifications via Twilio for urgent security alerts and payment reminders."),
        ("Module 8: Notifications & Alert Dispatch", "System sends automated email notifications via SendGrid for lease expiration notices and payment receipt confirmations."),
        ("Module 8: Notifications & Alert Dispatch", "User can mark individual notifications as read, or use 'Mark All Read' and 'Clear All' actions."),
        ("Module 8: Notifications & Alert Dispatch", "Notification cards provide interactive direct navigation links to corresponding system modules."),
        
        # Module 9: Reports & Data Analytics
        ("Module 9: Reports & Data Analytics", "User can generate and export Tenant Reports (tenant directory, room assignments, emergency contacts) to Excel format."),
        ("Module 9: Reports & Data Analytics", "User can generate and export Payment Reports (collection summaries, overdue accounts, monthly revenue) to Excel format."),
        ("Module 9: Reports & Data Analytics", "User can generate and export Room Occupancy Reports (capacity utilization, vacancy rates) to PDF format."),
        ("Module 9: Reports & Data Analytics", "User can generate and export Security Surveillance Reports (motion detection logs, incident history, camera uptime) to PDF format."),
        ("Module 9: Reports & Data Analytics", "Dashboard renders visual data analytics charts for 6-month revenue collection trends and room occupancy distribution.")
    ]
    
    t0 = doc.tables[0]
    
    # Keep header row (row 0), remove remaining existing rows
    while len(t0.rows) > 1:
        tr = t0.rows[-1]._tr
        t0._tbl.remove(tr)
        
    # Column widths in twips/dxa
    col_widths = [1087120, 2734945, 988060, 1127125]
    
    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            m_node = OxmlElement(f'w:{m_name}')
            m_node.set(qn('w:w'), str(val))
            m_node.set(qn('w:type'), 'dxa')
            tcMar.append(m_node)
        tcPr.append(tcMar)

    def set_row_properties(row, is_header=False):
        trPr = row._tr.get_or_add_trPr()
        cantSplit = OxmlElement('w:cantSplit')
        trPr.append(cantSplit)
        if is_header:
            tblHeader = OxmlElement('w:tblHeader')
            trPr.append(tblHeader)

    # Format header row
    set_row_properties(t0.rows[0], is_header=True)
    hdr_cells = t0.rows[0].cells
    hdr_titles = ["Module / Feature", "Feature Test Description", "Status (Pass/Fail)", "Remarks / Identified Issues"]
    for c_idx, text in enumerate(hdr_titles):
        hdr_cells[c_idx].text = ""
        p = hdr_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(10)
        hdr_cells[c_idx].width = col_widths[c_idx]
        set_cell_margins(hdr_cells[c_idx], top=120, bottom=120, left=150, right=150)
        
    # Add each test case row
    for mod_name, desc in test_cases:
        row = t0.add_row()
        set_row_properties(row, is_header=False)
        cells = row.cells
        
        # Cell 0: Module
        p0 = cells[0].paragraphs[0]
        r0 = p0.add_run(mod_name)
        r0.bold = True
        r0.font.name = "Arial"
        r0.font.size = Pt(9.5)
        
        # Cell 1: Description
        p1 = cells[1].paragraphs[0]
        r1 = p1.add_run(desc)
        r1.font.name = "Arial"
        r1.font.size = Pt(9.5)
        
        # Cell 2: Status
        p2 = cells[2].paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p2.add_run("☐ Pass\n☐ Fail")
        r2.font.name = "Arial"
        r2.font.size = Pt(9.5)
        
        # Cell 3: Remarks
        p3 = cells[3].paragraphs[0]
        p3.text = ""
        
        for i, w in enumerate(col_widths):
            cells[i].width = w
            set_cell_margins(cells[i], top=100, bottom=100, left=140, right=140)
            
    # 3. Update Table 1: Usability Evaluation
    t1 = doc.tables[1]
    while len(t1.rows) > 1:
        tr = t1.rows[-1]._tr
        t1._tbl.remove(tr)
        
    t1_widths = [4774565, 227330, 227330, 227330, 227330, 227330]
    
    # Header row
    set_row_properties(t1.rows[0], is_header=True)
    hdr1 = t1.rows[0].cells
    hdr1[0].text = ""
    p_crit = hdr1[0].paragraphs[0]
    r_crit = p_crit.add_run("Evaluation Criteria")
    r_crit.bold = True
    r_crit.font.name = "Arial"
    r_crit.font.size = Pt(10)
    
    for i in range(1, 6):
        hdr1[i].text = ""
        p_num = hdr1[i].paragraphs[0]
        p_num.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_num = p_num.add_run(str(6 - i))  # 5, 4, 3, 2, 1
        r_num.bold = True
        r_num.font.name = "Arial"
        r_num.font.size = Pt(10)
        
    for i, w in enumerate(t1_widths):
        hdr1[i].width = w
        set_cell_margins(hdr1[i], top=120, bottom=120, left=100, right=100)
        
    usability_criteria = [
        ("1. Ease of Use:", " The system interface is intuitive, responsive, and easy to navigate for boarding house administration."),
        ("2. Functionality:", " Modules and features (tenants, rooms, leases, payments, CCTV) perform tasks as intended without errors."),
        ("3. Responsiveness:", " Pages load promptly, and live CCTV video feeds stream smoothly with low latency."),
        ("4. Error Handling:", " The system provides clear input validation prompts and helpful error messages during operations."),
        ("5. Visual Appeal:", " The color scheme, dashboard layout, status badges, and typography are professional and consistent."),
        ("6. Security & Surveillance:", " Real-time CCTV streaming, motion alerts, and authentication function reliably and securely.")
    ]
    
    for prefix, body in usability_criteria:
        row = t1.add_row()
        set_row_properties(row, is_header=False)
        cells = row.cells
        p_crit = cells[0].paragraphs[0]
        r_pre = p_crit.add_run(prefix)
        r_pre.bold = True
        r_pre.font.name = "Arial"
        r_pre.font.size = Pt(9.5)
        r_body = p_crit.add_run(body)
        r_body.font.name = "Arial"
        r_body.font.size = Pt(9.5)
        
        for c_idx in range(1, 6):
            p_box = cells[c_idx].paragraphs[0]
            p_box.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_box = p_box.add_run("[  ]")
            r_box.font.name = "Arial"
            r_box.font.size = Pt(9.5)
            
        for i, w in enumerate(t1_widths):
            cells[i].width = w
            set_cell_margins(cells[i], top=100, bottom=100, left=100, right=100)
            
    # 4. Qualitative Feedback & Defect Logging
    # Find paragraph indices for Section IV
    p_bugs_idx = None
    p_recs_idx = None
    p_sig_idx = None
    p25_idx = None
    p26_idx = None
    
    for i, p in enumerate(doc.paragraphs):
        txt = p.text.strip()
        if "Did you encounter any bugs" in txt:
            p_bugs_idx = i
        elif "Recommendations for System Improvement" in txt:
            p_recs_idx = i
        elif "Evaluator Signature" in txt:
            p_sig_idx = i
        elif "For Section III (Functional Testing Results)" in txt or "For Section II (Functional Testing Results)" in txt:
            p25_idx = i
        elif "For Section IV (Usability Evaluation Results)" in txt or "For Section III (Usability Evaluation Results)" in txt:
            p26_idx = i

    # Update P_bugs with write-in lines
    p_bugs = doc.paragraphs[p_bugs_idx]
    p_bugs.clear()
    r_b_lbl = p_bugs.add_run("Did you encounter any bugs, crashes, or layout glitches? ")
    r_b_lbl.bold = True
    r_b_lbl.font.name = "Arial"
    r_b_sub = p_bugs.add_run("(Please describe what happened):\n\n")
    r_b_sub.font.name = "Arial"
    r_b_line = p_bugs.add_run("_________________________________________________________________________________\n"
                               "_________________________________________________________________________________")
    r_b_line.font.name = "Arial"
    
    # Update P_recs with write-in lines
    p_recs = doc.paragraphs[p_recs_idx]
    p_recs.clear()
    r_r_lbl = p_recs.add_run("Recommendations for System Improvement:\n\n")
    r_r_lbl.bold = True
    r_r_lbl.font.name = "Arial"
    r_r_line = p_recs.add_run("_________________________________________________________________________________\n"
                               "_________________________________________________________________________________")
    r_r_line.font.name = "Arial"
    
    # Update Signature line
    p_sig = doc.paragraphs[p_sig_idx]
    p_sig.clear()
    r_sig_lbl = p_sig.add_run("Evaluator Signature: ")
    r_sig_lbl.bold = True
    r_sig_lbl.font.name = "Arial"
    r_sig_line = p_sig.add_run("___________________________             ")
    r_sig_line.font.name = "Arial"
    r_date_lbl = p_sig.add_run("Date: ")
    r_date_lbl.bold = True
    r_date_lbl.font.name = "Arial"
    r_date_line = p_sig.add_run("___________________________")
    r_date_line.font.name = "Arial"
    
    # Update P25 (Success Rate description) keeping the formula drawing
    p25 = doc.paragraphs[p25_idx]
    p25.runs[0].text = "For Section II (Functional Testing Results):"
    p25.runs[1].text = " Count the total test cases tested per module. If 3 evaluators tested 6 features under Module 1 (18 test cases total) and 17 passed, your "
    p25.runs[2].text = "Success Rate"
    p25.runs[3].text = " is "
    # run 4 keeps the formula drawing
    p25.runs[5].text = "."
    
    # Update P26
    p26 = doc.paragraphs[p26_idx]
    p26.runs[0].text = "For Section III (Usability Evaluation Results):"
    p26.runs[1].text = " Calculate the "
    p26.runs[2].text = "Mean Score"
    p26.runs[3].text = " for each item across your 3 respondents:"
    
    # Clean up P29 to P33 descriptive interpretations (replace broken dash with clean en-dash)
    scale_items = [
        ("4.21 – 5.00:", " Highly Acceptable"),
        ("3.41 – 4.20:", " Acceptable"),
        ("2.61 – 3.40:", " Moderately Acceptable"),
        ("1.81 – 2.60:", " Slightly Acceptable"),
        ("1.00 – 1.80:", " Unacceptable")
    ]
    # Locate paragraphs for scale items (indices around 29-33)
    p_scale_start = None
    for i, p in enumerate(doc.paragraphs):
        if "Map the Mean Scores" in p.text:
            p_scale_start = i + 1
            break
            
    if p_scale_start:
        for s_idx, (r_range, r_interp) in enumerate(scale_items):
            p_curr = doc.paragraphs[p_scale_start + s_idx]
            p_curr.clear()
            r_rng = p_curr.add_run(r_range)
            r_rng.bold = True
            r_rng.font.name = "Arial"
            r_int = p_curr.add_run(r_interp)
            r_int.font.name = "Arial"
            
    output_filename = "AlphaTniEvan.docx"
    doc.save(output_filename)
    print(f"Successfully generated {output_filename} with {len(test_cases)} test cases and {len(usability_criteria)} usability criteria!")

if __name__ == "__main__":
    create_boarderswatch_alpha()
