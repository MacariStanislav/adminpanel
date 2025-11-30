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
  
  // Фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Простой пароль (замени на свой)
  const ADMIN_KEY =2072264;
  const brands = ['BMW', 'Mercedes', 'Toyota', 'Volkswagen', 'Dacia', 'Opel', 'Volvo', 'Audi', 'Skoda', 'Peugeot', 'Renault', 'Citroen'];
  const fuelTypes = ['Бензин', 'Дизель', 'Электричество', 'Гибрид'];
  const gearboxes = ['Механика', 'Автомат'];

  // Проверка правильности пароля
  const isAuthenticated = adminPassword == ADMIN_KEY;

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

  // Фильтрация машин
  const filteredCars = allCars.filter(car => {
    const matchesSearch = searchTerm === '' || 
      car.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPrice = maxPrice === '' || car.price <= Number(maxPrice);
    const matchesBrand = selectedBrand === '' || car.brand === selectedBrand;
    
    return matchesSearch && matchesPrice && matchesBrand;
  });

  const handleSingleChange = (e) => {
    const { name, value } = e.target;
    setSingleCar(prev => ({
      ...prev,
      [name]: ['price', 'mileage', 'engineDisplacement', 'yearOfManufacture'].includes(name) ? 
        Number(value) || 0 : value
    }));
  };

  const handleSingleSubmit = async () => {
    if (!isAuthenticated) { 
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
    if (!isAuthenticated) { 
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
    if (!isAuthenticated) { 
      setMessage('Неверный пароль для удаления'); 
      return; 
    }
    
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
        <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
          {isAuthenticated ? '✅ Пароль верный' : 'Введите пароль для добавления и удаления машин'}
        </div>
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
            backgroundColor: isAuthenticated ? '#007bff' : '#6c757d',
            color: '#fff', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: isAuthenticated ? 'pointer' : 'not-allowed'
          }}
          disabled={!isAuthenticated}
        >
          {isAuthenticated ? 'Добавить машину' : 'Введите пароль'}
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
                backgroundColor: isAuthenticated ? '#28a745' : '#6c757d',
                color: '#fff', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: isAuthenticated ? 'pointer' : 'not-allowed'
              }}
              disabled={!isAuthenticated}
            >
              {isAuthenticated 
                ? (currentIndex + 1 === carsArray.length ? 'Загрузить и закончить' : 'Загрузить и следующая')
                : 'Введите пароль'
              }
            </button>
          </>
        )}
      </div>

      {/* Улучшенный список всех машин с фильтрами */}
      <div style={{ flexBasis: '100%', marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2>Все машины на сервере ({filteredCars.length})</h2>
          
          {/* Фильтры */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {/* Поиск по названию */}
            <input
              type="text"
              placeholder="Поиск по марке или модели..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '200px' }}
            />
            
            {/* Фильтр по цене */}
            <input
              type="number"
              placeholder="Макс. цена (€)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '150px' }}
            />
            
            {/* Фильтр по бренду */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '150px' }}
            >
              <option value="">Все марки</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            
            {/* Кнопка сброса фильтров */}
            <button
              onClick={() => {
                setSearchTerm('');
                setMaxPrice('');
                setSelectedBrand('');
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Сбросить
            </button>
          </div>
        </div>

        {filteredCars.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredCars.map((car, index) => (
              <div 
                key={car._id || car.id || index} 
                style={{ 
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  padding: '15px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  backgroundColor: '#fff'
                }}
              >
                {/* Первое фото */}
                {car.mediaUrlPhoto && car.mediaUrlPhoto.length > 0 && (
                  <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                    <img 
                      src={car.mediaUrlPhoto[0]} 
                      alt={`${car.brand} ${car.model}`}
                      style={{ 
                        width: '100%', 
                        height: '200px', 
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                )}
                
                {/* Основная информация */}
                <div style={{ marginBottom: '10px' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>
                    {car.brand} {car.model}
                  </h3>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    <div>📅 {car.yearOfManufacture} год</div>
                    <div>💰 {car.price?.toLocaleString()} €</div>
                    <div>🛣️ {car.mileage?.toLocaleString()} км</div>
                    <div>⚙️ {car.engineDisplacement} л • {car.fuelType} • {car.gearbox}</div>
                  </div>
                </div>

                {/* Instagram ссылка */}
                {car.mediaUrlVideo && (
                  <div style={{ marginBottom: '15px' }}>
                    <a 
                      href={car.mediaUrlVideo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        color: '#E1306C', 
                        textDecoration: 'none',
                        fontWeight: '500'
                      }}
                    >
                      📹 Instagram видео
                    </a>
                  </div>
                )}

                {/* Кнопка удаления */}
                <button 
                  onClick={() => handleDelete(car._id || car.id)} 
                  style={{ 
                    width: '100%',
                    backgroundColor: isAuthenticated ? '#dc3545' : '#6c757d',
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    padding: '8px', 
                    cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                    fontSize: '14px'
                  }}
                  disabled={!isAuthenticated}
                >
                  {isAuthenticated ? 'Удалить машину' : 'Введите пароль для удаления'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            border: '2px dashed #ddd',
            borderRadius: '10px'
          }}>
            {allCars.length === 0 ? 'Нет машин на сервере' : 'Машины по вашему запросу не найдены'}
          </div>
        )}
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