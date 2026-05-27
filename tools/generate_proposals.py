import os
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

FONT_TH = 'TH Sarabun New'

# ── Helper Styling Functions for Plain Documents ──
def set_table_borders(table):
    tblPr = table._tbl.tblPr
    tblBorders = OxmlElement('w:tblBorders')
    
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')  # thin border
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), '000000')  # black border
        tblBorders.append(border)
        
    tblPr.append(tblBorders)

def add_para(container, text='', size=15, bold=False, italic=False,
             align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=6):
    if hasattr(container, 'paragraphs') and hasattr(container, '_tc'):
        p = container.paragraphs[0] if container.paragraphs else container.add_paragraph()
        p.clear()
    else:
        p = container.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    pf.line_spacing = 1.15
    if text:
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        run.font.name = FONT_TH
        run.font.size = Pt(size)
        run.font.color.rgb = RGBColor(0x00, 0x00, 0x00) # strictly black text
        run._element.rPr.rFonts.set(qn('w:eastAsia'), FONT_TH)
    return p

def add_run(para, text, size=15, bold=False, italic=False):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = FONT_TH
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor(0x00, 0x00, 0x00) # strictly black text
    run._element.rPr.rFonts.set(qn('w:eastAsia'), FONT_TH)
    return run

def apply_margins(doc):
    for sec in doc.sections:
        sec.page_width = Cm(21)
        sec.page_height = Cm(29.7)
        sec.top_margin = Cm(2.0)
        sec.bottom_margin = Cm(2.0)
        sec.left_margin = Cm(2.5)
        sec.right_margin = Cm(2.5)

# ══════════════════════════════════════════════════════════════════════════════
#  DOCUMENT 1: โครงการตามแบบฟอร์ม CA002 (CA002_project_proposal_timetable.docx)
# ══════════════════════════════════════════════════════════════════════════════
def build_ca002_proposal(out_path):
    print("Building Plain CA002 project proposal...")
    doc = Document()
    apply_margins(doc)
    
    # Title (Starts directly without cover page)
    p_title = add_para(doc, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_run(p_title, "โครงการพัฒนาระบบจัดการตารางสอนประจำสัปดาห์แบบประสานข้อมูลเรียลไทม์และสำรองข้อมูลผ่านระบบคลาวด์\n", size=16, bold=True)
    add_run(p_title, "กองการศึกษา โรงเรียนทหารขนส่ง กรมการขนส่งทหารบก ประจำปีงบประมาณ 2567", size=15, bold=True)
    
    doc.add_paragraph()
    
    # 1. หลักการและเหตุผล
    add_para(doc, "1. หลักการและเหตุผล", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, 
             "จากหลักสูตรการฝึกอบรมทางทหารของโรงเรียนทหารขนส่ง กรมการขนส่งทหารบก ซึ่งประกอบด้วยหลักสูตรทหารกองประจำการ "
             "นักเรียนนายสิบทหารขนส่ง และหลักสูตรการจัดหน่วยทหารขนส่ง รายวิชาการขนส่งด้วยรถยนต์ มีผู้เข้ารับการศึกษาหลายรุ่นพร้อมกัน "
             "การประสานงานตารางสอนประจำสัปดาห์ในปัจจุบันยังเป็นรูปแบบเดิมที่จัดทำข้อมูลผ่านกระดาษคำนวณ Excel หรือแผ่นกระดาษพิมพ์แจกจ่าย "
             "ซึ่งมีข้อจำกัดในการปรับปรุงแก้ไขกรณีที่มีงานเร่งด่วนของแผนกวิชาหรือครูผู้สอน ทำให้ข้อมูลเวลากับวิชาสลับกันเกิดความล่าช้าในการเผยแพร่ "
             "ส่งผลให้ชั่วโมงสอนสะสมคลาดเคลื่อนและเกิดตารางซ้ำซ้อนกันในหลายหลักสูตร ทำให้ผลสัมฤทธิ์การประเมินและคุณภาพศึกษาต่ำกว่าเปณฑ์",
             size=15)
             
    add_para(doc, 
             "ปัญหาดังกล่าวไม่สอดคล้องกับคู่มือการประกันคุณภาพการฝึกอบรมของกองทัพบก พ.ศ. 2566 – 2570 มาตรฐานที่ 1 หลักสูตรและการจัดการฝึกอบรม "
             "ตัวชี้วัดที่ 2 ด้านการจัดการเรียนรู้แบบ Active Learning และมาตรฐานที่ 2 ตัวชี้วัดที่ 5 ด้านเทคโนโลยีสารสนเทศในการจัดการเรียนรู้ "
             "ดังนั้น กองการศึกษา รร.ขส.ขส.ทบ. จึงจำเป็นต้องมีการนำนวัตกรรมระบบจัดการตารางสอนประจำสัปดาห์แบบประสานข้อมูลเรียลไทม์มาประยุกต์ใช้งาน "
             "เพื่อให้การเข้าถึงตารางและสถิติสะสมชั่วโมงมีความถูกต้อง และสามารถดูตารางผ่านอุปกรณ์พกพาได้รวดเร็ว",
             size=15)

    add_para(doc, 
             "โดยระบบนี้ได้พัฒนาในรูปแบบเว็บแอปพลิเคชัน Single Page Application (SPA) ทำงานบนเทคโนโลยีคลาวด์แบบ Serverless "
             "มีระบบจัดการความปลอดภัยข้อมูลที่เข้มงวดด้วยการเข้ารหัสผ่าน SHA-256 Hashing ก่อนบันทึก และการใช้ Database Secrets "
             "ในการเข้าถึงข้อมูล Firebase เพื่อรักษาความปลอดภัยข้อมูลส่วนบุคคลและข้อมูลของราชการทหารอย่างเป็นระบบ",
             size=15)

    # 2. วัตถุประสงค์
    add_para(doc, "2. วัตถุประสงค์", size=15, bold=True, space_before=10, space_after=4)
    objectives = [
        "เพื่อพัฒนาและจัดทำระบบจัดการตารางสอนประจำสัปดาห์แบบประสานข้อมูลเรียลไทม์คลาวด์ โรงเรียนทหารขนส่ง กรมการขนส่งทหารบก",
        "เพื่อยกระดับความถูกต้องของชั่วโมงเรียนสะสม และตัดปัญหาความซ้ำซ้อนตารางเรียนและครูผู้สอนชนกันของแต่ละหลักสูตร",
        "เพื่อความปลอดภัยระบบบัญชีและรักษาข้อมูลส่วนบุคคลผู้ใช้ตามมาตรฐานความปลอดภัยทางไซเบอร์ของกองทัพบก",
    ]
    for idx, obj in enumerate(objectives):
        add_para(doc, f"   2.{idx+1} {obj}", size=15)

    # 3. เป้าหมาย
    add_para(doc, "3. เป้าหมาย", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, "   3.1 เป้าหมายเชิงปริมาณ: กองการศึกษา รร.ขส.ขส.ทบ. สามารถใช้ระบบตารางสอนนี้บริหารจัดการเรียนการสอนครอบคลุมทุกหลักสูตรของโรงเรียนทหารขนส่ง (สูงสุด 10 หลักสูตร)", size=15)
    add_para(doc, "   3.2 เป้าหมายเชิงคุณภาพ: ความถูกต้องของข้อมูลชั่วโมงเรียนสะสมและระบบตารางสอนปราศจากข้อมูลชนกันอยู่ในระดับร้อยละ 100 และความพึงพอใจของกำลังพลผู้ใช้ระบบเฉลี่ยอยู่ในเกณฑ์ดีมาก (มากกว่าร้อยละ 85)", size=15)

    # 4. วิธีการดำเนินงาน (Gantt Chart Plain Table)
    add_para(doc, "4. วิธีการดำเนินงาน", size=15, bold=True, space_before=10, space_after=4)
    
    tbl = doc.add_table(rows=8, cols=4)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl)
    
    headers = ['ลำดับ', 'กิจกรรม/ขั้นตอนการดำเนินงาน', 'ระยะเวลาเริ่มต้น', 'ระยะเวลาสิ้นสุด']
    for i, h in enumerate(headers):
        cell = tbl.cell(0, i)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(p, h, size=13, bold=True)
        
    activities = [
        ('1', 'ศึกษารวบรวมข้อมูลปัญหาตารางเรียนและหลักเกณฑ์การประกันคุณภาพฯ', 'มกราคม 2567', 'กุมภาพันธ์ 2567'),
        ('2', 'ออกแบบเค้าโครงระบบ ซอฟต์แวร์ และฐานข้อมูลบน Firebase RTDB', 'มีนาคม 2567', 'มีนาคม 2567'),
        ('3', 'พัฒนาเว็บแอปพลิเคชันเวอร์ชันแรก และระบบความปลอดภัย (SHA-256 Hashing)', 'เมษายน 2567', 'พฤษภาคม 2567'),
        ('4', 'ทดลองใช้งานและตรวจสอบความปลอดภัยการเข้าถึง (Security rules / Secret)', 'มิถุนายน 2567', 'มิถุนายน 2567'),
        ('5', 'ติดตั้งใช้งานจริง ณ กองการศึกษา รร.ขส.ขส.ทบ. และสอนผู้ใช้งานหลัก', 'กรกฎาคม 2567', 'กรกฎาคม 2567'),
        ('6', 'ประเมินผลสัมฤทธิ์และความพึงพอใจการใช้ระบบผ่านแบบสอบถาม', 'สิงหาคม 2567', 'สิงหาคม 2567'),
        ('7', 'สรุปรายงานและเสนอผลโครงการแก่ผู้บังคับบัญชาตามลำดับชั้น', 'กันยายน 2567', 'กันยายน 2567'),
    ]
    
    for row_idx, row_data in enumerate(activities):
        for col_idx, text in enumerate(row_data):
            cell = tbl.cell(row_idx+1, col_idx)
            p = cell.paragraphs[0]
            if col_idx in [0, 2, 3]:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            add_run(p, text, size=13, bold=False)
            
    doc.add_paragraph()

    # 5. ระยะเวลาการดำเนินโครงการ
    add_para(doc, "5. ระยะเวลาการดำเนินโครงการ", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, "   ตั้งแต่วันที่ 1 มกราคม 2567 ถึงวันที่ 30 กันยายน 2567 (รวมระยะเวลา 9 เดือน)", size=15)

    # 6. งบประมาณ (Plain Budget Table)
    add_para(doc, "6. งบประมาณ", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, "   งบประมาณการจัดสร้างและพัฒนาระบบ (จัดสรรจากงบประมาณวิจัยศึกษาของหน่วยงาน):", size=15)
    
    tbl_budget = doc.add_table(rows=4, cols=5)
    tbl_budget.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_budget)
    
    b_headers = ['ลำดับ', 'รายการค่าใช้จ่าย', 'จำนวน : หน่วย', 'ราคา : หน่วย (บาท)', 'รวมทั้งสิ้น (บาท)']
    for i, h in enumerate(b_headers):
        cell = tbl_budget.cell(0, i)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(p, h, size=13, bold=True)
        
    b_rows = [
        ('1.', 'คู่มือแนะนำระบบ และคู่มือปฏิบัติงานอย่างละเอียด', '5 เล่ม', '200', '1,000'),
        ('2.', 'สื่ออุปกรณ์ทดสอบระบบออฟไลน์ (เราเตอร์สำรองและสาย LAN)', '1 ชุด', '2,500', '2,500'),
        ('', 'รวมทั้งสิ้น (สามพันห้าร้อยบาทถ้วน)', '', '', '3,500')
    ]
    
    for row_idx, row_data in enumerate(b_rows):
        cells = tbl_budget.row_cells(row_idx+1)
        is_total = row_idx == 2
        for col_idx, text in enumerate(row_data):
            cell = cells[col_idx]
            p = cell.paragraphs[0]
            if col_idx in [0, 2, 3, 4] and not is_total:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif is_total:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if col_idx == 4 else WD_ALIGN_PARAGRAPH.LEFT
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            add_run(p, text, size=13, bold=is_total)
            
    doc.add_paragraph()

    # 7. ผู้รับผิดชอบโครงการ
    add_para(doc, "7. ผู้รับผิดชอบโครงการ", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, "   พ.ต.ณัฐพล พัฒนกุล ตำแหน่ง อาจารย์ โรงเรียนทหารขนส่ง กรมการขนส่งทหารบก", size=15)

    # 8. การวัดผลและประเมินผล
    add_para(doc, "8. การวัดผลและประเมินผล", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, "   8.1 การวัดผลเชิงระบบ: ทำการทดสอบเจาะระบบและตรวจแฮชรหัสผ่านผู้ดูแลระบบ 100% พร้อมทดลองสลับปิดเน็ตตรวจความคงทนของระบบออฟไลน์\n"
                  "   8.2 การวัดความพึงพอใจ: ทำการเก็บผลสัมฤทธิ์และแบบสอบถามความพอใจจากแอดมินครูสอน จำนวน 50 นาย โดยเกณฑ์เฉลี่ยต้องอยู่ในระดับดีมาก", size=15)

    # 9. สื่อและเอกสารประกอบการประเมินผล
    add_para(doc, "9. สื่อและเอกสารประกอบการประเมินผล", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, "   9.1 แบบทดสอบความปลอดภัยซอฟต์แวร์ (Security Test Report)\n"
                  "   9.2 แบบประเมินผลความพึงพอใจการใช้ระบบตารางสอนดิจิทัล\n"
                  "   9.3 สรุปจำนวนชั่วโมงสอนจริงสะสมตามรายวิชา", size=15)

    # 10. ผลที่คาดว่าจะได้รับ
    add_para(doc, "10. ผลที่คาดว่าจะได้รับ", size=15, bold=True, space_before=10, space_after=4)
    add_para(doc, "   10.1 มีระบบตารางเรียนเรียลไทม์คลาวด์ใช้งานใน รร.ขส.ขส.ทบ. ข้อมูลตารางถูกต้อง 100% ลดปัญหาเวลาเรียนชนกัน\n"
                  "   10.2 ลดเวลาธุรการและค่าใช้จ่ายกระดาษในการจัดทำและเผยแพร่ตารางเรียนลงได้กว่าร้อยละ 90\n"
                  "   10.3 รหัสผ่านผู้ใช้งานมีความปลอดภัยสูงตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)", size=15)

    # Signatures
    doc.add_paragraph()
    doc.add_paragraph()
    tbl_sig = doc.add_table(rows=1, cols=2)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sig.autofit = False
    
    p_sig1 = tbl_sig.cell(0, 0).paragraphs[0]
    p_sig1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p_sig1, "ลงชื่อ....................................................ผู้จัดทำโครงการ\n", size=14)
    add_run(p_sig1, "( ณัฐพล พัฒนกุล )\n", size=14, bold=True)
    add_run(p_sig1, "ตำแหน่ง อจ.รร.ขส.ขส.ทบ.", size=13)
    
    p_sig2 = tbl_sig.cell(0, 1).paragraphs[0]
    p_sig2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p_sig2, "ลงชื่อ....................................................ผู้เห็นชอบโครงการ\n", size=14)
    add_run(p_sig2, "( นุรักษ์ ราชรักษ์ )\n", size=14, bold=True)
    add_run(p_sig2, "ตำแหน่ง อจ.หน.แผนกวิชาการขนส่ง รร.ขส.ขส.ทบ.", size=13)

    doc.save(out_path)
    print("SAVED: " + out_path)

# ══════════════════════════════════════════════════════════════════════════════
#  DOCUMENT 2: แบบเสนอผลงานนวัตกรรม (01_educational_innovation_proposal_timetable.docx)
# ══════════════════════════════════════════════════════════════════════════════
def build_innovation_proposal(out_path):
    print("Building Plain Educational Innovation Proposal...")
    doc = Document()
    apply_margins(doc)
    
    # ── MEMORANDUM (บันทึกข้อความ) ──
    p_ตรา = add_para(doc, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_run(p_ตรา, "บันทึกข้อความ", size=18, bold=True)
    
    tbl_memo = doc.add_table(rows=3, cols=2)
    tbl_memo.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Row 1
    p_memo00 = tbl_memo.cell(0, 0).paragraphs[0]
    add_run(p_memo00, "ส่วนราชการ  กศ.รร.ขส.ขส.ทบ. (โทร. ๕๒๒๗๒)", size=14, bold=True)
    p_memo01 = tbl_memo.cell(0, 1).paragraphs[0]
    add_run(p_memo01, "โทร. ๕๒๒๗๒", size=14)
    
    # Row 2
    p_memo10 = tbl_memo.cell(1, 0).paragraphs[0]
    add_run(p_memo10, "ที่  กห ๐๔๔๔.๑๓ / ", size=14, bold=True)
    p_memo11 = tbl_memo.cell(1, 1).paragraphs[0]
    add_run(p_memo11, "วันที่   ๒๗   กรกฎาคม   ๒๕๖๗", size=14, bold=True)
    
    # Row 3
    p_memo20 = tbl_memo.cell(2, 0).paragraphs[0]
    add_run(p_memo20, "เรื่อง  ขอส่งผลงานนวัตกรรมด้านการศึกษาเข้าร่วมประกวด ประจำปี ๒๕๖๗", size=14, bold=True)
    
    doc.add_paragraph()
    add_para(doc, "เรียน  ผบ.รร.ขส.ขส.ทบ. (ผ่าน ผตก.รร.ขส.ขส.ทบ.)", size=14, bold=True)
    
    memo_body = (
        "ตามอ้างถึงกองการศึกษา สพ.ศท.ยศ.ทบ. ขอเชิญส่งผลงานวิชาการเข้าร่วมประกวด ประจำปีงบประมาณ ๒๕๖๗ "
        "กองการศึกษา โรงเรียนทหารขนส่ง ขอส่งผลงานนวัตกรรมด้านการศึกษาในหัวข้อ 'ระบบตารางสอนประจำสัปดาห์แบบประสานข้อมูลเรียลไทม์"
        "และสำรองข้อมูลอัตโนมัติ' ซึ่งเป็นสิ่งประดิษฐ์ซอฟต์แวร์ประยุกต์บริหารสถาบันศึกษา พัฒนาขึ้นโดย พ.ต.ณัฐพล พัฒนกุล "
        "โดยได้ดำเนินการลงทะเบียนในระบบเป็นที่เรียบร้อย รายละเอียดตามสิ่งที่ส่งมาด้วยนี้\n\n"
        "จึงเรียนมาเพื่อกรุณาทราบและพิจารณาดำเนินการต่อไป"
    )
    add_para(doc, memo_body, size=14)
    
    p_memo_sig = add_para(doc, align=WD_ALIGN_PARAGRAPH.RIGHT)
    add_run(p_memo_sig, "พ.อ. ....................................................\n", size=14)
    add_run(p_memo_sig, "( วสันต์ วราสินธุ์ )\n", size=14, bold=True)
    add_run(p_memo_sig, "ผอ.กศ.รร.ขส.ขส.ทบ.", size=13)
    
    doc.add_page_break()
    
    # ── INNOVATION REPORT (แบบเสนอผลงานวิชาการด้านการศึกษา) ──
    p_h2 = add_para(doc, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_run(p_h2, "แบบเสนอผลงานวิชาการด้านการศึกษา\n", size=16, bold=True)
    add_run(p_h2, "เข้าร่วมงานประชุมวิชาการและสรุปผลการพัฒนาคุณภาพการศึกษา ประจำปี ๒๕๖๗\n", size=14, bold=True)
    add_run(p_h2, "สำนักการศึกษา กรมยุทธศึกษาทหารบก", size=14, bold=True)
    
    doc.add_paragraph()
    
    # 1. ชื่อผลงาน
    add_para(doc, "1. ชื่อผลงานวิชาการด้านการศึกษา", size=15, bold=True, space_before=8)
    add_para(doc, "   •  ชื่อภาษาไทย: ระบบจัดการตารางสอนประจำสัปดาห์แบบประสานข้อมูลเรียลไทม์และสำรองข้อมูลอัตโนมัติ\n"
                  "   •  ชื่อภาษาอังกฤษ: Weekly Timetable Management System with Real-Time Cloud Sync & Automated Backup\n"
                  "   •  ประเภทนวัตกรรม: นวัตกรรมสิ่งประดิษฐ์ทางด้านการศึกษา / ระบบบริการจัดการสถานศึกษาดิจิทัล", size=14)
                  
    # 2. รายชื่อคณะผู้จัดทำ
    add_para(doc, "2. รายชื่อคณะผู้จัดทำ", size=15, bold=True, space_before=8)
    add_para(doc, "   พ.ต. ณัฐพล พัฒนกุล (อาจารย์ โรงเรียนทหารขนส่ง กรมการขนส่งทหารบก)\n"
                  "   อีเมล: nattapon.ats01@gmail.com   โทรศัพท์: 090-924-2555", size=14)
                  
    # 3. สถานศึกษา
    add_para(doc, "3. สถานศึกษา/สถาบันการศึกษาที่สังกัด", size=15, bold=True, space_before=8)
    add_para(doc, "   โรงเรียนทหารขนส่ง กรมการขนส่งทหารบก", size=14)
    
    # 4. ที่มาของแนวคิดในการพัฒนาผลงาน
    add_para(doc, "4. ที่มาของแนวคิดในการพัฒนาผลงานวิชาการด้านการศึกษา", size=15, bold=True, space_before=8)
    add_para(doc, 
             "หลักสูตรเรียนของโรงเรียนทหารขนส่ง กรมการขนส่งทหารบก มักมีการปรับแผนและเปลี่ยนวิชาสอนกะทันหันบ่อยครั้งเนื่องจากภารกิจทหาร "
             "ทำให้ตารางสอนกระดาษหรือ Excel เดิมต้องแก้ใหม่รายสัปดาห์ ข้อมูลเวลาเรียนและผู้ตรวจอนุมัติสะสมชั่วโมงไม่ตรงกัน "
             "ทำให้เกิดความล่าช้าในการเผยแพร่และตารางเรียนชนกัน ซึ่งขัดต่อมาตรฐานคุณภาพการเรียนรู้ ยศ.ทบ. พ.ศ. 2566 – 2570 "
             "ดังนั้น กองการศึกษา รร.ขส.ขส.ทบ. จึงเห็นควรพัฒนา 'ระบบตารางสอนประจำสัปดาห์แบบเรียลไทม์' "
             "ซึ่งโฮสต์ฟรีแบบออฟไลน์และออนไลน์พร้อมสตรีมเหตุการณ์ซิงค์ข้อมูลผ่าน Google Firebase และ GitHub Pages อัตโนมัติ "
             "นวัตกรรมนี้นอกจากจะคำนวณชั่วโมงสะสมถูกต้องรวดเร็วแล้ว ยังรักษาความปลอดภัยข้อมูลรหัสผ่านแอดมินด้วย SHA-256 Hashing ฝั่งไคลเอนต์", 
             size=14)

    # 5. วัตถุประสงค์
    add_para(doc, "5. วัตถุประสงค์", size=15, bold=True, space_before=8)
    add_para(doc, "   1. เพื่อพัฒนาระบบซอฟต์แวร์จัดการตารางเรียนเรียลไทม์คลาวด์ ป้องกันตารางชนและคำนวณชั่วโมงสะสมวิชาเรียนถูกต้อง 100%\n"
                  "   2. เพื่อรักษาความปลอดภัยข้อมูลและควบคุมสิทธิ์การเข้าถึงฐานข้อมูล Firebase ด้วย Database Secrets และ SHA-256 Hashing\n"
                  "   3. เพื่อเพิ่มความพึงพอใจการเข้าถึงข้อมูลตารางเรียนครูและนักเรียนผ่านสมาร์ทโฟน", size=14)

    # 6. คุณสมบัติ/คุณลักษณะเฉพาะและขอบเขตการใช้งานของผลงาน
    add_para(doc, "6. คุณสมบัติ/คุณลักษณะเฉพาะและขอบเขตการใช้งานของผลงาน", size=15, bold=True, space_before=8)
    add_para(doc, "   •  เป็นซอฟต์แวร์ Single Page Application (SPA) ทำงานได้รวดเร็ว โครงสร้างหน้าจอไม่ซับซ้อน ไฟล์ขนาดเบามาก\n"
                  "   •  การแฮชรหัสผ่าน: เข้ารหัสผ่านบัญชีฝั่งเบราว์เซอร์ด้วย SHA-256 และส่ง REST API คู่กับ Database Secrets จำกัดสิทธิ์คลาวด์\n"
                  "   •  ระบบซิงค์เรียลไทม์: เทคโนโลยี Server-Sent Events (SSE) คลาส EventSource ช่วยให้เครื่องแอดมินอัพเดทตารางร่วมกันเรียลไทม์\n"
                  "   •  ขอบเขตการทำงาน: บริหารชื่อโรงเรียน, ครูอาจารย์, วิชาเรียนสะสม, ห้องเรียน, วันหยุดเรียน และปุ่มพิมพ์ A4 เลขไทย", size=14)

    # 7. หลักการ วิธีการ และขั้นตอนการทำงานของผลงาน (Plain PDCA Table)
    add_para(doc, "7. หลักการ วิธีการ และขั้นตอนการทำงานของผลงาน", size=15, bold=True, space_before=8)
    
    tbl_pdca = doc.add_table(rows=5, cols=2)
    tbl_pdca.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_pdca)
    
    pdca_data = [
        ('ขั้นตอนพัฒนา', 'รายละเอียดกิจกรรม'),
        ('P — วางแผน (Plan)', 'ศึกษาระเบียบชั่วโมงเรียนและคู่มือประกันคุณภาพ ยศ.ทบ. รวบรวมปัญหาตารางซ้อนและครูชนกัน เพื่อเขียนวิเคราะห์โครงสร้างฐานข้อมูล'),
        ('D — ปฏิบัติ (Do)', 'ออกแบบเขียนโปรแกรม HTML/JS/CSS จำลอง localApi และเชื่อมต่อ Firebase Realtime DB, รัน EventSource และพัฒนาความปลอดภัย SHA-256 Hashing'),
        ('C — ตรวจสอบ (Check)', 'จำลองการตั้งค่าระบบ Firebase Rules และคีย์ Secrets เพื่อทดลองแฮกและทดสอบรหัสผ่านบัญชีแอดมิน เพื่อความมั่นคงปลอดภัยฐานข้อมูล'),
        ('A — ปรับปรุง (Act)', 'นำระบบเข้าทดสอบรันจริง ณ โรงเรียนทหารขนส่ง ในหลักสูตร นนส.ขส. รุ่นที่ 27 และสอนใช้งานพร้อมเขียนบันทึกประวัติข้อเสนอแนะเพื่อพัฒนาต่อยอดแอปพลิเคชันออนไลน์'),
    ]
    
    for row_idx, (p_step, p_desc) in enumerate(pdca_data):
        cells = tbl_pdca.row_cells(row_idx)
        is_hdr = row_idx == 0
        
        p0 = cells[0].paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p0.paragraph_format.space_before = Pt(3)
        p0.paragraph_format.space_after = Pt(3)
        add_run(p0, p_step, size=12, bold=is_hdr)
        
        p1 = cells[1].paragraphs[0]
        p1.paragraph_format.space_before = Pt(3)
        p1.paragraph_format.space_after = Pt(3)
        add_run(p1, p_desc, size=12, bold=is_hdr)

    doc.add_paragraph()

    # 8. จุดเด่น หรือกลไกการทำงานที่เป็นจุดเด่นที่แตกต่างจากของผู้อื่น
    add_para(doc, "8. จุดเด่น หรือกลไกการทำงานที่เป็นจุดเด่นที่แตกต่างจากของผู้อื่น", size=15, bold=True, space_before=8)
    add_para(doc, 
             "   1)  **ไร้ค่าใช้จ่ายเซิร์ฟเวอร์ (Zero-Server-Hosting Cost)**: ระบบออกแบบโดยใช้สถาปัตยกรรมไร้เซิร์ฟเวอร์ พึ่งพา Firebase Free Tier และ GitHub Pages ทำให้ไม่มีภาระค่าเช่าโฮสติ้งเซิร์ฟเวอร์รายปีในการใช้งานแอปพลิเคชัน\n"
             "   2)  **ความปลอดภัยข้อมูลส่วนบุคคลฝั่งไคลเอนต์**: การแฮชรหัสผ่านในเบราว์เซอร์ด้วย SHA-256 มั่นใจได้ว่าไม่มีคีย์รหัสผ่าน Plaintext รั่วไหลสู่คลาวด์สาธารณะ และปิดกั้นสิทธิ์เขียน Firebase ด้วยระบบ Secrets Rules\n"
             "   3)  **ระบบออฟไลน์แคชและสำรองซ้อน**: แม้ออฟไลน์ยังรันดูตารางสอนได้ และมีตัวสำรอง Snapshot JSON บน GitHub กู้คืนได้ทันทีกรณีระบบคลาวด์หลักเกิดความเสียหาย", size=14)

    # 9. ประโยชน์และคุณค่าของผลงาน
    add_para(doc, "9. ประโยชน์และคุณค่าของผลงาน", size=15, bold=True, space_before=8)
    add_para(doc, "   •  **ต่อโรงเรียนขนส่ง**: ได้ระบบตารางเรียนอิเล็กทรอนิกส์กลาง ลดเวลาจัดตารางลง 5 เท่า ป้องกันตารางชน 100% ประหยัดค่าวัสดุกระดาษธุรการ\n"
                  "   •  **ต่อครูผู้สอน**: สามารถตรวจสอบและอัพเดทตารางเรียนของตนเองผ่านสมาร์ทโฟนได้รวดเร็วทันที ลดปัญหาการติดต่อประสานงานคลาดเคลื่อน\n"
                  "   •  **ต่อนักเรียนทหาร**: ทราบตารางเรียนที่แน่นอน ล่วงหน้าและทันท่วงที ช่วยส่งเสริมประสิทธิภาพและระบบเตรียมความพร้อมศึกษา", size=14)

    # Signatures
    doc.add_paragraph()
    doc.add_paragraph()
    tbl_sig = doc.add_table(rows=1, cols=1)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    p_sig = tbl_sig.cell(0, 0).paragraphs[0]
    p_sig.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p_sig, "ลงชื่อ....................................................ผู้จัดเสนอผลงาน\n", size=14)
    add_run(p_sig, "( ณัฐพล พัฒนกุล )\n", size=14, bold=True)
    add_run(p_sig, "ตำแหน่ง อจ.รร.ขส.ขส.ทบ.\n", size=13)
    add_run(p_sig, "วันที ๒๗ กรกฎาคม พ.ศ. ๒๕๖๗", size=13)

    doc.save(out_path)
    print("SAVED: " + out_path)

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN EXECUTION
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(base_dir, '..', 'docs')
    os.makedirs(docs_dir, exist_ok=True)
    
    p1 = os.path.join(docs_dir, 'CA002_project_proposal_timetable.docx')
    p2 = os.path.join(docs_dir, '01_educational_innovation_proposal_timetable.docx')
    
    build_ca002_proposal(p1)
    build_innovation_proposal(p2)
    
    print("\nSuccessfully compiled both plain proposal templates!")
