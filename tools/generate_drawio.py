import base64
import zlib
import urllib.request
import urllib.parse
import re
import os
import sys

# Define flowcharts
flowcharts = [
    {
        "name": "01 App Initialization Flow",
        "code": """graph TD
    A([เริ่มต้น: เปิดหน้าเว็บ]) --> B[โหลดไฟล์ HTML / CSS / JS]
    B --> C[เรียกฟังก์ชัน initApp]
    C --> D{มีข้อมูลแคชใน LocalStorage?}
    D -- "มีข้อมูลแคช" --> E[โหลดข้อมูลตารางสอนวิชา แอดมิน จากแคชในเบราว์เซอร์]
    D -- "ไม่มีข้อมูลแคช" --> F[สร้างตารางข้อมูลว่างเปล่าไว้ใน Local]
    E --> G[ตรวจสอบคีย์การเชื่อมต่อ Firebase URL & Secret]
    F --> G
    G --> H[เรียกฟังก์ชัน syncUsersBeforeLogin]
    H --> I{เชื่อมโยง Firebase สำเร็จ?}
    I -- "สำเร็จ" --> J[เรียก fbGet ดึงบัญชีผู้ใช้ล่าสุดมาบันทึกทับใน Local]
    I -- "ล้มเหลว / ออฟไลน์" --> K[เรียก loadFromGitHub ดึงบัญชีผู้ใช้สำรองจาก GitHub Pages]
    J --> L[ตรวจสอบจำนวนบัญชีผู้ดูแลระบบ]
    K --> L
    L --> M{มีบัญชีผู้ดูแลระบบหรือไม่?}
    M -- "ไม่มีผู้ดูแลระบบเลย" --> N[เปิดหน้าจอลงทะเบียนครั้งแรก First-Time Setup<br>เพื่อสร้างบัญชี Super Admin]
    M -- "มีผู้ดูแลระบบอยู่แล้ว" --> O[เปิดหน้าจอเข้าสู่ระบบ Login Form]
    N --> P([เสร็จสิ้นการตั้งค่าเริ่มต้น])
    O --> P"""
    },
    {
        "name": "02 Authentication & Password Auto-Upgrade",
        "code": """graph TD
    A([ผู้ใช้กดปุ่ม Login]) --> B[ดึงข้อความจากช่อง Username และ Password]
    B --> C{ข้อมูลครบถ้วนและยาวตามเกณฑ์?}
    C -- "ไม่ครบถ้วน" --> D[แสดงข้อความเตือนความถูกต้องบนหน้าจอ]
    C -- "ครบถ้วน" --> E[เรียกฟังก์ชัน localApi ส่งคำขอ POST /auth/login]
    E --> F[ค้นหาผู้ใช้งานจาก Username ใน Local Cache]
    F --> G{พบผู้ใช้งานในระบบ?}
    G -- "ไม่พบผู้ใช้" --> H[ส่งค่าตอบกลับ 401: บัญชีหรือรหัสผ่านไม่ถูกต้อง]
    G -- "พบผู้ใช้" --> I{รหัสผ่านที่บันทึกเป็นแฮช SHA-256 หรือไม่?<br>ความยาว 64 ตัวอักษร}
    I -- "ใช่ (แฮชแล้ว)" --> J[นำรหัสผ่านที่ป้อนมาทำการแฮชด้วย hashPassword]
    J --> K{รหัสแฮชตรงกันหรือไม่?}
    K -- "ไม่ตรงกัน" --> H
    K -- "ตรงกัน" --> L[เข้าสู่ระบบสำเร็จ]
    I -- "ไม่ใช่ (Plaintext รุ่นเก่า)" --> M{รหัสผ่านตรงกับข้อความดิบหรือไม่?}
    M -- "ไม่ตรงกัน" --> H
    M -- "ตรงกัน" --> N[อัปเกรดรหัสผ่าน:<br>นำรหัสผ่านที่ป้อนมาแฮชเป็น SHA-256]
    N --> O[บันทึกรหัสแฮชทับใน LocalStorage]
    O --> P[เรียก fbSet อัปเกรดรหัสแฮชขึ้นสู่คลาวด์ Firebase]
    P --> L
    L --> Q[บันทึก Session Token ลงใน LocalStorage]
    Q --> R[เปลี่ยนหน้าจอเข้าสู่ระบบ Dashboard แอดมิน]"""
    },
    {
        "name": "03 Real-Time Database Sync",
        "code": """graph TD
    subgraph Client [เครื่องแอดมินผู้เขียน Admin Client]
        A1([แอดมินแก้ไขตารางสอน]) --> A2[เรียกฟังก์ชัน api PUT /entries/id]
        A2 --> A3[อัปเดตตาราง LocalStorage ทันที]
        A3 --> A4[เรียก fbSet ส่งคำขอข้อมูลไปยัง Firebase]
    end

    subgraph Firebase [เซิร์ฟเวอร์ฐานข้อมูลคลาวด์ Google Firebase]
        F1{ตรวจสอบ Token ความปลอดภัย ?auth=SECRET}
        F2[ปฏิเสธคำขอ 403 Forbidden]
        F3[บันทึกข้อมูลทับบนคลาวด์ Node /data/entries/id]
        F4[ยิงเหตุการณ์ 'put' ไปยังเบราว์เซอร์ทั้งหมด]
        
        F1 -- "ไม่ถูกต้อง" --> F2
        F1 -- "ถูกต้อง" --> F3
        F3 --> F4
    end

    subgraph OtherClients [เครื่องผู้ใช้อื่นๆ Other Clients/Public Viewer]
        B1{ได้ยินเหตุการณ์การเปลี่ยนแปลง}
        B2[นำข้อมูลใหม่ไปเขียนทับแคช Local ในเบราว์เซอร์]
        B3[เรียกฟังก์ชัน renderScheduleView อีกครั้ง]
        B4([ตารางเรียนบนหน้าจอปรับปรุงให้สอดคล้องกันทันที])
        
        B1 --> B2
        B2 --> B3
        B3 --> B4
    end

    A4 -->|ส่งข้อมูลผ่าน REST API + Token| F1
    F4 -->|SSE Stream event| B1"""
    },
    {
        "name": "04 GitHub Backup & Fallback Flow",
        "code": """graph TD
    A([แอดมินสั่งสำรองข้อมูล]) --> B[ดึง Snapshot ตารางสอนทั้งหมดในรูปแบบ data.json]
    B --> C[ตรวจสอบ Token และ URL ของ GitHub Pages]
    C --> D{มีการตั้งค่าครบถ้วนหรือไม่?}
    D -- "ไม่ครบถ้วน" --> E[แจ้งเตือนให้ตั้งค่า GitHub Config ในแท็บตั้งค่า]
    D -- "ครบถ้วน" --> F[เรียกอ่านค่าไฟล์ SHA ล่าสุดจาก GitHub Contents API]
    F --> G[เข้ารหัสข้อความ data.json เป็น Base64]
    G --> H[ส่งคำขอ PUT อัปเดตข้อมูลขึ้น GitHub API]
    H -- "บันทึกสำเร็จ" --> I[แสดงสถานะการสำรองข้อมูลเสร็จสิ้น สำเร็จ]
    H -- "ล้มเหลว" --> J[บันทึกประวัติข้อบกพร่องลงในระบบ Log ของเบราว์เซอร์]"""
    }
]

def encode_mermaid(graph_code):
    graph_bytes = graph_code.encode("utf-8")
    base64_bytes = base64.urlsafe_b64encode(graph_bytes)
    return base64_bytes.decode("ascii")

def get_svg_image_dimensions(svg_content):
    # Search for viewBox
    viewbox_match = re.search(r'viewBox="0 0 ([0-9.]+) ([0-9.]+)"', svg_content)
    if viewbox_match:
        return float(viewbox_match.group(1)), float(viewbox_match.group(2))
    # Fallback to width/height
    width_match = re.search(r'width="([0-9.]+)"', svg_content)
    height_match = re.search(r'height="([0-9.]+)"', svg_content)
    if width_match and height_match:
        return float(width_match.group(1)), float(height_match.group(2))
    return 800.0, 600.0

xml_parts = []
xml_parts.append('<mxfile host="Electron" modified="2026-05-27T14:18:21Z" agent="5.0" version="22.1.2" type="device">')

for i, fc in enumerate(flowcharts):
    encoded = encode_mermaid(fc["code"])
    url = f"https://mermaid.ink/svg/{encoded}"
    print(f"Fetching SVG for: {fc['name']} from {url}")
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            svg_bytes = response.read()
            svg_content = svg_bytes.decode("utf-8")
            
            # Get dimensions
            w, h = get_svg_image_dimensions(svg_content)
            
            # Base64 encode the SVG string for Draw.io data URI
            b64_svg = base64.b64encode(svg_bytes).decode("utf-8")
            image_uri = f"data:image/svg+xml;base64,{b64_svg}"
            
            # Escape XML special characters in Mermaid code for the value property
            # so the user can easily copy it from the shape description/tooltip
            escaped_code = fc["code"].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace('\n', '&#xa;')
            
            diagram_xml = f"""  <diagram id="diagram_page_{i}" name="{fc['name']}">
    <mxGraphModel dx="1200" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="cell_{i}" value="{escaped_code}" style="shape=image;verticalLabelPosition=bottom;verticalAlign=top;imageAspect=0;aspect=fixed;image={image_uri};" vertex="1" parent="1">
          <mxGeometry x="50" y="50" width="{w}" height="{h}" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>"""
            xml_parts.append(diagram_xml)
            print(f"Added {fc['name']} (width={w}, height={h})")
    except Exception as e:
        print(f"Error fetching SVG for {fc['name']}: {e}", file=sys.stderr)
        # Fallback empty page
        diagram_xml = f"""  <diagram id="diagram_page_{i}" name="{fc['name']}">
    <mxGraphModel dx="1200" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="800" pageHeight="600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>"""
        xml_parts.append(diagram_xml)

xml_parts.append('</mxfile>')

output_xml = "\n".join(xml_parts)
out_dir = os.path.join(os.path.dirname(__file__), '..', 'docs')
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'timetable_flowcharts.drawio')

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output_xml)

print(f"\nSUCCESS: Generated {out_path} containing all 4 flowcharts as high-quality, offline-compatible SVG images inside a multi-page Draw.io diagram.")
