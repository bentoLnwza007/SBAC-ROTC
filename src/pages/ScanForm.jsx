import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';

function ScanForm() {
  const { qrId } = useParams();
  const [qrData, setQrData] = useState(null);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getQRInfo = async () => {
      try {
        const docRef = doc(db, "qr_codes", qrId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQrData(docSnap.data());
        } else {
          alert("ไม่พบข้อมูลคิวอาร์โค้ดนี้ในระบบ");
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    getQRInfo();
  }, [qrId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !studentId) return alert("กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่ง");

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    try {
      await addDoc(collection(db, "attendance_records"), {
        qrId: qrId,
        category: qrData.title,
        name: name,
        studentId: studentId,
        date: formattedDate,
        timestamp: new Date().toISOString()
      });
      alert("บันทึกการเช็คชื่อเข้าเรียนเสร็จสิ้น!");
      setName('');
      setStudentId('');
    } catch (err) { alert("เกิดข้อผิดพลาด: " + err.message); }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: '50px' }}>กำลังดึงข้อมูลระบบสแกน...</p>;
  if (!qrData) return <p style={{ textAlign: 'center', padding: '50px', color: 'red' }}>คิวอาร์โค้ดไม่ถูกต้องหรือถูกลบไปแล้ว</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ color: '#007bff' }}>แบบฟอร์มบันทึกการเช็คชื่อ</h2>
      <div style={{ border: '2px dashed #007bff', padding: '10px', background: '#e9f5ff', borderRadius: '8px', marginBottom: '20px' }}>
        <strong>หมวดหมู่ที่เช็คชื่อ: {qrData.title}</strong>
      </div>
      
      <form onSubmit={handleSubmit} style={{ textAlign: 'left', background: '#fff', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label>ชื่อ - นามสกุลจริง:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', boxSizing: 'border-box' }} placeholder="เช่น นายสมชาย รักเรียน" />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label>รหัสนักศึกษา:</label>
          <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', boxSizing: 'border-box' }} placeholder="ระบุรหัสประจำตัว" />
        </div>
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>กดส่งข้อมูลเช็คชื่อ</button>
      </form>
    </div>
  );
}
export default ScanForm;