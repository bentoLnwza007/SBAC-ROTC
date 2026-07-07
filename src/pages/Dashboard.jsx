import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, addDoc, query, where, doc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

function Dashboard() {
  const [title, setTitle] = useState('');
  const [qrList, setQrList] = useState([]); 
  const [searchDate, setSearchDate] = useState('');
  const [dailyQRs, setDailyQRs] = useState([]);
  
  const [selectedQR, setSelectedQR] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [isZoomOpen, setIsZoomOpen] = useState(false); 

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) navigate('/');
    });
    return () => unsubscribe();
  }, [navigate]);

  const getTodayFormattedDate = () => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  };

  // [Real-time] ดึงรายการ QR Code ของวันนี้
  useEffect(() => {
    const todayStr = getTodayFormattedDate();
    const q = query(collection(db, "qr_codes"), where("dateCreated", "==", todayStr));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setQrList(items);
    }, (err) => {
      console.error("Error fetching today QRs:", err);
    });

    return () => unsubscribe();
  }, []);

  // [Real-time] ดึงรายชื่อคนเช็คชื่อของ QR ที่เลือก
  useEffect(() => {
    if (!selectedQR) {
      setAttendanceList([]);
      return;
    }

    const q = query(collection(db, "attendance_records"), where("qrId", "==", selectedQR.id));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push(doc.data());
      });
      records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setAttendanceList(records);
    }, (err) => {
      console.error("Error fetching attendance:", err);
    });

    return () => unsubscribe();
  }, [selectedQR]);

  const handleCreateQR = async (e) => {
    e.preventDefault();
    if (!title) return;
    const formattedDate = getTodayFormattedDate();
    try {
      const docRef = await addDoc(collection(db, "qr_codes"), {
        title: title,
        creator: auth.currentUser?.email,
        dateCreated: formattedDate,
        createdAt: new Date().toISOString()
      });
      setTitle('');
      setSelectedQR({ id: docRef.id, title: title, dateCreated: formattedDate });
      
      // บนมือถือ ให้เลื่อนหน้าจอลงไปดูรายละเอียดทันทีที่สร้าง
      setTimeout(() => {
        document.getElementById('detail-zone')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteQR = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("คุณแน่ใจใช่ไหมว่าจะลบ QR Code นี้?")) {
      try {
        await deleteDoc(doc(db, "qr_codes", id));
        if (selectedQR?.id === id) setSelectedQR(null);
      } catch (err) { alert("ลบไม่สำเร็จ: " + err.message); }
    }
  };

  const handleSearchHistory = async () => {
    if (!searchDate) return alert("กรุณาเลือกวันที่ก่อนค้นหา");
    const formattedDate = searchDate.split('-').reverse().join('/');
    const q = query(collection(db, "qr_codes"), where("dateCreated", "==", formattedDate));
    const querySnapshot = await getDocs(q);
    const qrs = [];
    querySnapshot.forEach((doc) => qrs.push({ id: doc.id, ...doc.data() }));
    setDailyQRs(qrs);
  };

  const downloadQRCode = (qrId, title) => {
    const svg = document.getElementById(`qr-svg-${qrId}`) || document.getElementById(`qr-svg-zoom-${qrId}`);
    if (!svg) return alert("ไม่พบไฟล์คิวอาร์สําหรับดาวน์โหลด");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 300, 300);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${title || 'code'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleSelectQR = (qr) => {
    setSelectedQR(qr);
    // คลิกปุ๊บ เลื่อนหน้าจอลงไปดูตารางรายชื่อให้อัตโนมัติ (สะดวกมากบนมือถือ)
    setTimeout(() => {
      document.getElementById('detail-zone')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="dashboard-container">
      
      {/* 📱 สไตล์ CSS ที่ปรับแต่งเพื่อรองรับมือถือและหน้าจอทุกขนาด */}
      <style>{`
        * { box-sizing: border-box; }
        
        .dashboard-container {
          padding: 24px 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #f8fafc;
          color: #1e293b;
          min-height: 100vh;
          max-width: 1200px;
          margin: 0 auto;
        }

        .panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; width: 100%; }
        
        .form-group { display: flex; gap: 12px; width: 100%; }
        .input-text { padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 15px; outline: none; flex: 1; min-width: 0; }
        .input-text:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
        
        /* การจัดวางแบบ Grid อัจฉริยะ ปรับตามความกว้างหน้าจอ */
        .main-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        
        @media (min-width: 768px) {
          .main-grid { grid-template-columns: 1.1fr 1.9fr; } /* หน้าจอคอม/iPad จะแบ่งเป็น 2 คอลัมน์ */
          .dashboard-container { padding: 30px 24px; }
        }

        .qr-item-btn { width: 100%; text-align: left; padding: 14px 16px; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0; font-size: 14px; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: white; color: #334155; }
        .qr-item-btn:hover { background: #f1f5f9; }
        .qr-item-active { background: #2563eb !important; color: white !important; border-color: #2563eb !important; font-weight: 600; }
        
        .btn-base { padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }
        .btn-blue { background: #2563eb; color: white; }
        .btn-blue:hover { background: #1d4ed8; }
        .btn-gray { background: #f1f5f9; color: #475569; }
        .btn-gray:hover { background: #e2e8f0; }

        .readable-table { width: 100%; border-collapse: collapse; text-align: left; }
        .readable-table th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 13px; padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
        .readable-table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px; }
        
        .badge-live { background: #ef4444; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

        /* ป๊อปอัปขยาย QR ขนาดปรับตามหน้าจอมือถืออัตโนมัติ */
        .popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 999; padding: 16px; }
        .popup-box { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); width: 100%; max-width: 380px; text-align: center; }
        .qr-container-zoom svg { width: 100% !important; height: auto !important; max-width: 240px; }
      `}</style>

      {/* ส่วนหัวเว็บ (Header) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', gap: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>SBAC-checkin</h1>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '12px' }}>เช็คชื่อ</p>
        </div>
        <button className="btn-base btn-gray" style={{ color: '#ef4444', padding: '8px 12px', fontSize: '13px' }} onClick={() => signOut(auth)}>🚪 ออกจากระบบ</button>
      </div>

      {/* ส่วนสร้าง QR Code */}
      <div className="panel">
        <h3 style={{ marginTop: 0, fontSize: '14px', color: '#0f172a', marginBottom: '10px' }}>➕ สร้างช่องทางเช็คชื่อใหม่</h3>
        <form onSubmit={handleCreateQR} className="form-group">
          <input 
            type="text" 
            className="input-text"
            placeholder="ระบุชั้นปี/กิจกรรม" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-base btn-blue" style={{ padding: '0 16px' }}>สร้าง</button>
        </form>
      </div>

      {/* โซนทำงานหลัก: คอมพิวเตอร์จะเป็น (ซ้าย-ขวา) ส่วนมือถือจะเป็น (บน-ล่าง) */}
      <div className="main-grid">
        
        {/* ส่วนที่ 1: รายการ QR ของวันนี้ */}
        <div className="panel" style={{ height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, fontSize: '14px', color: '#0f172a', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📦 รายการวันนี้ ({getTodayFormattedDate()})</span>
          </h3>
          
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {qrList.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '15px 0' }}>ยังไม่มีคิวอาร์โค้ดสำหรับวันนี้</p>
            ) : qrList.map(qr => (
              <div 
                key={qr.id} 
                className={`qr-item-btn ${selectedQR?.id === qr.id ? 'qr-item-active' : ''}`}
                onClick={() => handleSelectQR(qr)}
              >
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%', fontSize: '14px' }}>
                  📌 {qr.title}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteQR(qr.id, e); }} 
                  style={{ background: 'transparent', border: 'none', color: selectedQR?.id === qr.id ? '#fee2e2' : '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ส่วนที่ 2: แสดงผลคิวอาร์ที่เลือก + ตารางรายชื่อ (อัปเดตแบบ Real-time) */}
        <div id="detail-zone" className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {!selectedQR ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', minHeight: '150px', textAlign: 'center' }}>
              ◀ คลิกเลือกรายการคิวอาร์ด้านบน<br/>เพื่อเปิดดูรูปคิวอาร์และตารางรายชื่อ
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{selectedQR.title}</h3>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '11px' }}>ID: {selectedQR.id.substring(0,8)}...</p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setIsZoomOpen(true)} className="btn-base btn-blue" style={{ padding: '6px 10px', fontSize: '12px' }}>🔍 จอใหญ่</button>
                  <button onClick={() => downloadQRCode(selectedQR.id, selectedQR.title)} className="btn-base btn-gray" style={{ padding: '6px 10px', fontSize: '12px' }}>💾 โหลดรูป</button>
                </div>
              </div>

              {/* ซ่อนรูป QR ย่อไว้สำหรับฟังก์ชันดาวน์โหลด */}
              <div style={{ display: 'none' }}>
                <QRCode id={`qr-svg-${selectedQR.id}`} value={`${window.location.origin}/scan/${selectedQR.id}`} size={100} />
              </div>

              {/* ตารางรายชื่อที่ผูกติดหน้าจออัปเดตตามจริง */}
              <div style={{ border: '1px solid #e2e8f0', border_radius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>👤 รายชื่อนักศึกษา</span>
                  <span style={{ color: '#2563eb' }}>มาแล้ว {attendanceList.length} คน</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="readable-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center', width: '45px' }}>#</th>
                        <th>ชื่อ - นามสกุล</th>
                        <th style={{ textAlign: 'center', width: '110px' }}>รหัส</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.length === 0 ? (
                        <tr><td colSpan="3" style={{ padding: '25px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>ยังไม่มีคนสแกนเข้ามา... รอรับข้อมูลแบบสดๆ ⏳</td></tr>
                      ) : (
                        attendanceList.map((h, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>{i + 1}</td>
                            <td style={{ fontWeight: '500' }}>{h.name}</td>
                            <td style={{ textAlign: 'center', color: '#475569', fontSize: '13px' }}>{h.studentId}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ส่วนประวัติข้อมูลย้อนหลัง */}
      <div className="panel">
        <h3 style={{ marginTop: 0, fontSize: '14px', color: '#0f172a', marginBottom: '10px' }}>🕰️ เรียกดูข้อมูลวันอื่นๆ ย้อนหลัง</h3>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="date" 
            value={searchDate} 
            onChange={(e) => setSearchDate(e.target.value)} 
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', flex: '1', minWidth: '150px' }} 
          />
          <button onClick={handleSearchHistory} className="btn-base btn-gray" style={{ border: '1px solid #cbd5e1', padding: '9px 14px' }}>ค้นหา</button>
        </div>

        {dailyQRs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>พบรายการของวันที่ค้นหา:</span>
            {dailyQRs.map(qr => (
              <button 
                key={qr.id} 
                onClick={() => handleSelectQR(qr)}
                style={{ padding: '10px', textAlign: 'left', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px' }}
              >
                📅 {qr.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* POPUP หน้าจอขยาย QR CODE ตัวใหญ่ */}
      {selectedQR && isZoomOpen && (
        <div className="popup-overlay" onClick={() => setIsZoomOpen(false)}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>{selectedQR.title}</h2>
            
            <div className="qr-container-zoom" style={{ padding: '16px', background: '#ffffff', display: 'inline-block', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '10px', width: '100%' }}>
              <QRCode id={`qr-svg-zoom-${selectedQR.id}`} value={`${window.location.origin}/scan/${selectedQR.id}`} size={250} />
            </div>
            
            <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', margin: '0 0 15px 0' }}>
              ⚠️ โปรดอย่าแชร์ QR Code นี้ให้ผู้อื่นโดยไม่จำเป็น เพราะทุกคนที่สแกนจะถูกบันทึกชื่อและรหัสนักศึกษา  
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => downloadQRCode(selectedQR.id, selectedQR.title)} className="btn-base btn-blue" style={{ flex: 1 }}>💾 โหลดรูป</button>
              <button onClick={() => setIsZoomOpen(false)} className="btn-base btn-gray" style={{ flex: 1 }}>ปิด</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default Dashboard;