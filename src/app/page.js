'use client';

import { useState, useEffect } from 'react';
import api from '@/utils/api';

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [singleCar, setSingleCar] = useState({
    brand: '', 
    model: '', 
    yearOfManufacture: 2024, 
    engineDisplacement: 0, 
    fuelType: '', 
    gearbox: '', 
    mileage: 0, 
    price: 0,
    mediaUrlVideo: '' 
  });
  const [singlePhotos, setSinglePhotos] = useState([]);

  const [carsArray, setCarsArray] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bulkPhotos, setBulkPhotos] = useState([]);

  const [allCars, setAllCars] = useState([]);
  const [message, setMessage] = useState('');

  const ADMIN_KEY = '1234'; 

  const brands = ['BMW', 'Mercedes', 'Toyota', 'Volkswagen', 'Dacia', 'Opel', 'Volvo', 'Audi', 'Skoda', 'Peugeot', 'Renault', 'Citroen'];
  const fuelTypes = ['Бензин', 'Дизель', 'Электричество', 'Гибрид'];
  const gearboxes = ['Механика', 'Автомат'];

  const fetchAllCars = async () => {
    try {
      const res = await api.get('/cars');
      const carsData = Array.isArray(res.data) ? res.data : res.data.cars || [];
      setAllCars(carsData);
    } catch (err) {
      console.error(err);
      setMessage('Ошибка при загрузке машин с сервера');
    }
  };

  useEffect(() => { 
    fetchAllCars(); 
  }, []);

  const handleSingleChange = (e) => {
    const { name, value } = e.target;
    setSingleCar(prev => ({
      ...prev,
      [name]: ['price', 'mileage', 'engineDisplacement', 'yearOfManufacture'].includes(name) ? 
        Number(value) || 0 : value
    }));
  };

  const handleSingleSubmit = async () => {
    if (adminPassword !== ADMIN_KEY) { 
      setMessage('Неверный пароль'); 
      return; 
    }
    if (!singlePhotos.length) { 
      setMessage('Добавьте хотя бы одно фото'); 
      return; 
    }

    try {
      const formData = new FormData();
      
      Object.entries(singleCar).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          formData.append(k, v.toString());
        }
      });
      
      singlePhotos.forEach(p => formData.append('mediaUrlPhoto', p));

      console.log('Отправляемые данные:', {
        brand: singleCar.brand,
        model: singleCar.model,
        mediaUrlVideo: singleCar.mediaUrlVideo
      });

      const res = await api.post('/cars', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      setAllCars(prev => [...prev, res.data]);
      setMessage(`✅ Машина "${singleCar.brand} ${singleCar.model}" добавлена | Instagram: ${singleCar.mediaUrlVideo || 'не указан'}`);

      setSingleCar({
        brand: '', 
        model: '', 
        yearOfManufacture: 2024, 
        engineDisplacement: 0, 
        fuelType: '', 
        gearbox: '', 
        mileage: 0, 
        price: 0,
        mediaUrlVideo: ''
      });
      setSinglePhotos([]);
    } catch (err) {
      console.error('Ошибка при добавлении машины:', err);
      setMessage(`❌ Ошибка: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!Array.isArray(data)) throw new Error('JSON должен быть массивом');
        setCarsArray(data);
        setCurrentIndex(0);
        setBulkPhotos([]);
        setMessage(`Загружено ${data.length} машин для bulk`);
      } catch {
        setMessage('Неверный формат JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleBulkUploadMedia = async () => {
    if (adminPassword !== ADMIN_KEY) { 
      setMessage('Неверный пароль'); 
      return; 
    }

    const currentCar = carsArray[currentIndex];
    if (!currentCar) return;
    if (!bulkPhotos.length) { 
      setMessage('Добавьте хотя бы одно фото'); 
      return; 
    }

    try {
      const formData = new FormData();
      Object.entries(currentCar).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          formData.append(k, v);
        }
      });
      bulkPhotos.forEach(p => formData.append('mediaUrlPhoto', p));

      const res = await api.post('/cars/bulk', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      setAllCars(prev => [...prev, res.data]);
      setMessage(`Машина "${currentCar.brand} ${currentCar.model}" добавлена`);

      setBulkPhotos([]);

      if (currentIndex + 1 < carsArray.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCarsArray([]);
        setMessage('Все машины успешно загружены!');
      }
    } catch (err) {
      console.error(err);
      setMessage('Ошибка при bulk добавлении машины');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту машину?')) return;
    try {
      await api.delete('/cars', { data: { id } });
      fetchAllCars();
      setMessage('Машина удалена');
    } catch (err) {
      console.error(err);
      setMessage('Ошибка при удалении машины');
    }
  };

  const currentBulkCar = carsArray[currentIndex];

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>

      <div style={{ flexBasis: '100%', marginBottom: '20px' }}>
        <input 
          type="password" 
          placeholder="Пароль администратора" 
          value={adminPassword} 
          onChange={e => setAdminPassword(e.target.value)}
          style={{ padding: '8px', width: '300px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
      </div>

      {/* Добавить одну машину */}
      <div style={{ flex: 1, minWidth: '300px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2>Добавить одну машину</h2>
        
        {/* Бренд - select */}
        <label>Марка *</label>
        <select 
          name="brand" 
          value={singleCar.brand} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">Выберите марку</option>
          {brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        {/* Модель */}
        <label>Модель *</label>
        <input 
          name="model" 
          type="text" 
          placeholder="Модель" 
          value={singleCar.model} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {/* Год выпуска */}
        <label>Год выпуска *</label>
        <input 
          name="yearOfManufacture" 
          type="number" 
          placeholder="Год выпуска" 
          value={singleCar.yearOfManufacture} 
          onChange={handleSingleChange}
          min="1990" 
          max="2024"
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {/* Объем двигателя */}
        <label>Объем двигателя (л) *</label>
        <input 
          name="engineDisplacement" 
          type="number" 
          step="0.1"
          placeholder="Объем двигателя" 
          value={singleCar.engineDisplacement} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {/* Тип топлива - select */}
        <label>Тип топлива *</label>
        <select 
          name="fuelType" 
          value={singleCar.fuelType} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">Выберите тип топлива</option>
          {fuelTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* КПП - select */}
        <label>Коробка передач *</label>
        <select 
          name="gearbox" 
          value={singleCar.gearbox} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">Выберите КПП</option>
          {gearboxes.map(gearbox => (
            <option key={gearbox} value={gearbox}>{gearbox}</option>
          ))}
        </select>

        {/* Пробег */}
        <label>Пробег (км) *</label>
        <input 
          name="mileage" 
          type="number" 
          placeholder="Пробег" 
          value={singleCar.mileage} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {/* Цена */}
        <label>Цена (€) *</label>
        <input 
          name="price" 
          type="number" 
          placeholder="Цена" 
          value={singleCar.price} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {/* Ссылка на Instagram */}
        <label>Ссылка на Instagram</label>
        <input 
          name="mediaUrlVideo" 
          type="url" 
          placeholder="https://www.instagram.com/p/DRooCIVjQq5/" 
          value={singleCar.mediaUrlVideo} 
          onChange={handleSingleChange}
          style={{ margin: '5px 0', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {/* Фото */}
        <label>Фото (обязательно хотя бы 1)</label>
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={e => setSinglePhotos([...singlePhotos, ...Array.from(e.target.files)])} 
        />
        {singlePhotos.length > 0 ? (
          <p>{singlePhotos.map((p, i) => `${i + 1}: ${p.name}`).join(', ')}</p>
        ) : (
          <p>Фото ещё не выбрано</p>
        )}

        <button 
          onClick={handleSingleSubmit} 
          style={{ 
            marginTop: '10px', 
            padding: '8px 12px', 
            backgroundColor: '#007bff', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          Добавить машину
        </button>
      </div>

      {/* Bulk Upload */}
      <div style={{ flex: 1, minWidth: '300px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2>Добавить несколько машин (Bulk Upload)</h2>
        {!carsArray.length && <input type="file" accept=".json" onChange={handleJsonUpload} />}
        
        {currentBulkCar && (
          <>
            <h3>{currentIndex + 1}/{carsArray.length}: {currentBulkCar.brand} {currentBulkCar.model}</h3>
            
            {/* Показываем видео ссылку если есть в JSON */}
            {currentBulkCar.mediaUrlVideo && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Видео из JSON:</strong> {currentBulkCar.mediaUrlVideo}
              </div>
            )}
            
            <label>Фото (обязательно хотя бы 1)</label>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={e => setBulkPhotos([...bulkPhotos, ...Array.from(e.target.files)])} 
            />
            {bulkPhotos.length > 0 ? (
              <p>{bulkPhotos.map((p, i) => `${i + 1}: ${p.name}`).join(', ')}</p>
            ) : (
              <p>Фото ещё не выбрано</p>
            )}

            <button 
              onClick={handleBulkUploadMedia} 
              style={{ 
                marginTop: '10px', 
                padding: '8px 12px', 
                backgroundColor: '#28a745', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer' 
              }}
            >
              {currentIndex + 1 === carsArray.length ? 'Загрузить и закончить' : 'Загрузить и следующая'}
            </button>
          </>
        )}
      </div>

      {/* Список всех машин */}
      <div style={{ flexBasis: '100%', marginTop: '30px' }}>
        <h2>Все машины на сервере ({allCars.length})</h2>
        {allCars.length > 0 ? allCars.map((car, index) => (
          <div 
            key={car._id || car.id || index} 
            style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              marginBottom: '5px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderRadius: '5px' 
            }}
          >
            <div>
              <strong>{car.brand} {car.model}</strong> - {car.yearOfManufacture}г. - {car.price}€ - {car.mileage}км
              {car.mediaUrlVideo && (
                <a 
                  href={car.mediaUrlVideo} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ marginLeft: '10px', color: '#E1306C', textDecoration: 'none' }}
                >
                  📹 Instagram
                </a>
              )}
            </div>
            <button 
              onClick={() => handleDelete(car._id || car.id)} 
              style={{ 
                backgroundColor: 'red', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                padding: '4px 8px', 
                cursor: 'pointer' 
              }}
            >
              Delete
            </button>
          </div>
        )) : <p>Нет машин на сервере</p>}
      </div>

      {message && (
        <div style={{ flexBasis: '100%' }}>
          <p style={{ 
            color: message.includes('Ошибка') ? 'red' : 'green', 
            marginTop: '10px', 
            padding: '10px', 
            borderRadius: '5px',
            backgroundColor: message.includes('Ошибка') ? '#ffe6e6' : '#e6ffe6'
          }}>
            {message}
          </p>
        </div>
      )}
    </div>
  );
}