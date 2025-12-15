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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');

  const [allCars, setAllCars] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Простой пароль (замени на свой)
  const ADMIN_KEY = 2072264;
  const brands = ['BMW', 'Mercedes', 'Toyota', 'Volkswagen', 'Dacia', 'Opel', 'Volvo', 'Audi', 'Skoda', 'Peugeot', 'Renault', 'Citroen'];
  const fuelTypes = ['Бензин', 'Дизель', 'Электричество', 'Гибрид'];
  const gearboxes = ['Механика', 'Автомат'];

  // Проверка правильности пароля
  const isAuthenticated = adminPassword == ADMIN_KEY;

  const fetchAllCars = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/cars');
      const carsData = Array.isArray(res.data) ? res.data : res.data.cars || [];
      // Убираем дубликаты по ID
      const uniqueCars = carsData.filter((car, index, self) =>
        index === self.findIndex((c) => (
          c._id === car._id || 
          (c.id && c.id === car.id) ||
          (c.brand === car.brand && c.model === car.model && c.yearOfManufacture === car.yearOfManufacture)
        ))
      );
      setAllCars(uniqueCars);
    } catch (err) {
      console.error(err);
      setMessage('Ошибка при загрузке машин с сервера');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchAllCars(); 
  }, []);

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

      const res = await api.post('/cars', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      // ВАЖНО: Не добавляем сразу в состояние, а обновляем весь список
      // с сервера чтобы избежать дублирования
      await fetchAllCars();
      
      setMessage(`✅ Машина "${singleCar.brand} ${singleCar.model}" добавлена | Instagram: ${singleCar.mediaUrlVideo || 'не указан'}`);

      // Сброс формы
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    // Проверяем расширение файла
    if (fileExtension !== 'json' && fileExtension !== 'txt') {
      setMessage('❌ Неверный формат файла. Поддерживаются только JSON и TXT файлы.');
      return;
    }

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let data;
        
        if (fileExtension === 'json') {
          data = JSON.parse(event.target.result);
        } else if (fileExtension === 'txt') {
          data = JSON.parse(event.target.result);
        }
        
        if (!Array.isArray(data)) throw new Error('Файл должен содержать массив машин');
        
        // Валидация данных
        const validatedData = data.map((car, index) => {
          if (!car.brand || !car.model || !car.price) {
            console.warn(`Машина #${index + 1} пропущена: отсутствуют обязательные поля`);
            return null;
          }
          
          return {
            brand: String(car.brand || ''),
            model: String(car.model || ''),
            yearOfManufacture: Number(car.yearOfManufacture) || 2024,
            engineDisplacement: Number(car.engineDisplacement) || 0,
            fuelType: String(car.fuelType || 'Бензин'),
            gearbox: String(car.gearbox || 'Автомат'),
            mileage: Number(car.mileage) || 0,
            price: Number(car.price) || 0,
            mediaUrlVideo: String(car.mediaUrlVideo || '')
          };
        }).filter(car => car !== null);

        if (validatedData.length === 0) {
          setMessage('❌ В файле нет валидных данных о машинах');
          return;
        }

        setCarsArray(validatedData);
        setCurrentIndex(0);
        setBulkPhotos([]);
        setUploadProgress(0);
        
        const skipped = data.length - validatedData.length;
        const skippedMessage = skipped > 0 ? ` (${skipped} невалидных записей пропущено)` : '';
        
        setMessage(`✅ Загружено ${validatedData.length} машин из файла "${file.name}"${skippedMessage}`);
        
      } catch (error) {
        console.error('Ошибка при чтении файла:', error);
        setMessage(`❌ Ошибка при чтении файла: ${error.message}. Убедитесь, что файл содержит валидный JSON.`);
      }
    };
    
    reader.onerror = () => {
      setMessage('❌ Ошибка при чтении файла');
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
      setMessage('Добавьте хотя бы одно фото для текущей машины'); 
      return; 
    }

    try {
      setMessage(`⏳ Загружаю машину ${currentIndex + 1}/${carsArray.length}...`);
      
      const formData = new FormData();
      Object.entries(currentCar).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          formData.append(k, v.toString());
        }
      });
      bulkPhotos.forEach(p => formData.append('mediaUrlPhoto', p));

      const res = await api.post('/cars/bulk', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      // НЕ добавляем в состояние сразу, а обновляем весь список
      // после успешной загрузки текущей машины
      // setAllCars(prev => [...prev, res.data]); // УДАЛЕНО
      
      const progress = Math.round(((currentIndex + 1) / carsArray.length) * 100);
      setUploadProgress(progress);
      setMessage(`✅ Машина "${currentCar.brand} ${currentCar.model}" успешно загружена (${currentIndex + 1}/${carsArray.length})`);

      setBulkPhotos([]);

      if (currentIndex + 1 < carsArray.length) {
        setCurrentIndex(currentIndex + 1);
        setTimeout(() => {
          document.getElementById('bulk-file-input')?.focus();
        }, 100);
      } else {
        // Когда все машины загружены, обновляем весь список с сервера
        await fetchAllCars();
        setCarsArray([]);
        setFileName('');
        setUploadProgress(100);
        setMessage('🎉 Все машины успешно загружены! Файл обработан.');
        setTimeout(() => {
          setUploadProgress(0);
        }, 2000);
      }
    } catch (err) {
      console.error('Ошибка при bulk добавлении машины:', err);
      setMessage(`❌ Ошибка при загрузке машины: ${err.response?.data?.message || err.message}`);
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
      // Обновляем весь список после удаления
      await fetchAllCars();
      setMessage('✅ Машина удалена');
    } catch (err) {
      console.error(err);
      setMessage('❌ Ошибка при удалении машины');
    }
  };

  const currentBulkCar = carsArray[currentIndex];

  const renderCarCard = (car) => (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '15px',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#2c3e50' }}>
          {car.brand} {car.model}
        </h3>
        <span style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {car.yearOfManufacture} год
        </span>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '8px',
        fontSize: '14px',
        color: '#495057'
      }}>
        <div>💰 <strong>{car.price?.toLocaleString()} €</strong></div>
        <div>🛣️ {car.mileage?.toLocaleString()} км</div>
        <div>⚙️ {car.engineDisplacement} л</div>
        <div>⛽ {car.fuelType}</div>
        <div>🔧 {car.gearbox}</div>
        {car.mediaUrlVideo && (
          <div style={{ gridColumn: 'span 2' }}>
            📹 Instagram: <span style={{ fontSize: '12px', color: '#6c757d' }}>
              {car.mediaUrlVideo.length > 40 ? car.mediaUrlVideo.substring(0, 40) + '...' : car.mediaUrlVideo}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>

      <div style={{ flexBasis: '100%', marginBottom: '20px' }}>
        <input 
          type="password" 
          placeholder="Пароль администратора" 
          value={adminPassword} 
          onChange={e => setAdminPassword(e.target.value)}
          style={{ 
            padding: '10px 15px', 
            width: '300px', 
            borderRadius: '8px', 
            border: `2px solid ${isAuthenticated ? '#28a745' : '#ccc'}`,
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.3s'
          }}
        />
        <div style={{ marginTop: '8px', fontSize: '13px', color: isAuthenticated ? '#28a745' : '#666' }}>
          {isAuthenticated ? '✅ Пароль верный. Доступ разрешен.' : '⚠️ Введите пароль для добавления и удаления машин'}
        </div>
      </div>

      {/* Добавить одну машину */}
      <div style={{ flex: 1, minWidth: '300px', border: '1px solid #ddd', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: '#fff' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '20px' }}>
          🚗 Добавить одну машину
        </h2>
        
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Марка *</label>
        <select 
          name="brand" 
          value={singleCar.brand} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            backgroundColor: '#f8f9fa',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.3s'
          }}
        >
          <option value="">Выберите марку</option>
          {brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Модель *</label>
        <input 
          name="model" 
          type="text" 
          placeholder="Модель" 
          value={singleCar.model} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.3s'
          }}
        />

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Год выпуска *</label>
        <input 
          name="yearOfManufacture" 
          type="number" 
          placeholder="Год выпуска" 
          value={singleCar.yearOfManufacture} 
          onChange={handleSingleChange}
          min="1990" 
          max="2024"
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Объем двигателя (л) *</label>
        <input 
          name="engineDisplacement" 
          type="number" 
          step="0.1"
          placeholder="Объем двигателя" 
          value={singleCar.engineDisplacement} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Тип топлива *</label>
        <select 
          name="fuelType" 
          value={singleCar.fuelType} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            backgroundColor: '#f8f9fa',
            fontSize: '14px',
            outline: 'none'
          }}
        >
          <option value="">Выберите тип топлива</option>
          {fuelTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Коробка передач *</label>
        <select 
          name="gearbox" 
          value={singleCar.gearbox} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            backgroundColor: '#f8f9fa',
            fontSize: '14px',
            outline: 'none'
          }}
        >
          <option value="">Выберите КПП</option>
          {gearboxes.map(gearbox => (
            <option key={gearbox} value={gearbox}>{gearbox}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Пробег (км) *</label>
        <input 
          name="mileage" 
          type="number" 
          placeholder="Пробег" 
          value={singleCar.mileage} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Цена (€) *</label>
        <input 
          name="price" 
          type="number" 
          placeholder="Цена" 
          value={singleCar.price} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>Ссылка на Instagram</label>
        <input 
          name="mediaUrlVideo" 
          type="url" 
          placeholder="https://www.instagram.com/p/DRooCIVjQq5/" 
          value={singleCar.mediaUrlVideo} 
          onChange={handleSingleChange}
          style={{ 
            margin: '0 0 15px 0', 
            padding: '10px', 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid #ced4da',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#495057' }}>
          📸 Фото (обязательно хотя бы 1)
        </label>
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={e => setSinglePhotos([...singlePhotos, ...Array.from(e.target.files)])}
          style={{ 
            marginBottom: '10px',
            padding: '8px',
            width: '100%',
            border: '2px dashed #007bff',
            borderRadius: '6px',
            backgroundColor: '#f0f8ff'
          }}
        />
        {singlePhotos.length > 0 ? (
          <div style={{ 
            backgroundColor: '#e7f4e4', 
            padding: '10px', 
            borderRadius: '6px', 
            marginBottom: '15px' 
          }}>
            <strong>Выбрано фото:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              {singlePhotos.map((p, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#555' }}>
                  {i + 1}. {p.name} ({(p.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: '#fff3cd', 
            padding: '10px', 
            borderRadius: '6px', 
            marginBottom: '15px',
            fontSize: '13px',
            color: '#856404'
          }}>
            ⚠️ Фото ещё не выбрано
          </div>
        )}

        <button 
          onClick={handleSingleSubmit} 
          style={{ 
            marginTop: '10px', 
            padding: '12px 20px', 
            backgroundColor: isAuthenticated ? '#007bff' : '#6c757d',
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: '600',
            width: '100%',
            transition: 'all 0.3s',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
          disabled={!isAuthenticated || isLoading}
          onMouseEnter={e => isAuthenticated && (e.target.style.backgroundColor = '#0056b3')}
          onMouseLeave={e => isAuthenticated && (e.target.style.backgroundColor = '#007bff')}
        >
          {isLoading ? '⏳ Загрузка...' : isAuthenticated ? '✅ Добавить машину' : '🔒 Введите пароль'}
        </button>
      </div>

      {/* Bulk Upload - Улучшенный */}
      <div style={{ 
        flex: 1, 
        minWidth: '300px', 
        border: '1px solid #ddd', 
        borderRadius: '12px', 
        padding: '20px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        backgroundColor: '#fff'
      }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #28a745', paddingBottom: '10px', marginBottom: '20px' }}>
          📦 Пакетная загрузка машин
        </h2>
        
        {/* Шаг 1: Загрузка файла */}
        {!carsArray.length ? (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ 
              fontSize: '72px',
              color: '#e9ecef',
              marginBottom: '15px'
            }}>
              📄
            </div>
            <p style={{ color: '#6c757d', marginBottom: '20px' }}>
              Загрузите JSON или TXT файл с данными машин
            </p>
            
            <div style={{ 
              marginBottom: '25px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px dashed #dee2e6'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#495057' }}>
                Формат файла:
              </p>
              <div style={{ textAlign: 'left', fontSize: '13px', color: '#6c757d' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ color: '#28a745', marginRight: '8px' }}>✓</span>
                  <span>Поддерживаемые форматы: <strong>.json</strong>, <strong>.txt</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ color: '#28a745', marginRight: '8px' }}>✓</span>
                  <span>Файл должен содержать массив объектов</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#28a745', marginRight: '8px' }}>✓</span>
                  <span>Каждый объект - данные одной машины</span>
                </div>
              </div>
            </div>
            
            <label style={{
              display: 'inline-block',
              padding: '12px 25px',
              backgroundColor: '#28a745',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              marginBottom: '15px'
            }}>
              📁 Выбрать файл (.json или .txt)
              <input 
                type="file" 
                accept=".json,.txt" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }}
              />
            </label>
            
            <div style={{ 
              fontSize: '12px', 
              color: '#6c757d', 
              marginTop: '15px',
              padding: '15px',
              backgroundColor: '#f0f8ff',
              borderRadius: '6px',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>Пример структуры данных:</p>
              <pre style={{ 
                backgroundColor: '#1e1e1e', 
                color: '#d4d4d4', 
                padding: '10px', 
                borderRadius: '5px',
                fontSize: '11px',
                overflowX: 'auto',
                margin: 0
              }}>
{`[
  {
    "brand": "BMW",
    "model": "X5",
    "yearOfManufacture": 2022,
    "engineDisplacement": 3.0,
    "fuelType": "Бензин",
    "gearbox": "Автомат",
    "mileage": 15000,
    "price": 55000,
    "mediaUrlVideo": "ссылка"
  }
]`}
              </pre>
              <p style={{ margin: '10px 0 0 0', fontSize: '11px' }}>
                Скачать пример: 
                <button 
                  onClick={() => {
                    const exampleData = [
                      {
                        "brand": "BMW",
                        "model": "X5",
                        "yearOfManufacture": 2022,
                        "engineDisplacement": 3.0,
                        "fuelType": "Бензин",
                        "gearbox": "Автомат",
                        "mileage": 15000,
                        "price": 55000,
                        "mediaUrlVideo": "https://www.instagram.com/p/DRooCIVjQq5/"
                      },
                      {
                        "brand": "Mercedes",
                        "model": "E-Class",
                        "yearOfManufacture": 2021,
                        "engineDisplacement": 2.0,
                        "fuelType": "Дизель",
                        "gearbox": "Автомат",
                        "mileage": 25000,
                        "price": 48000,
                        "mediaUrlVideo": "https://www.instagram.com/p/CUoA1VhDjK2/"
                      }
                    ];
                    
                    const dataStr = JSON.stringify(exampleData, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = window.URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'example_cars.json';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    setMessage('✅ Пример файла скачан как "example_cars.json"');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    marginLeft: '5px',
                    fontSize: '11px'
                  }}
                >
                  example_cars.json
                </button>
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Информация о файле */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#e7f4e4',
              borderRadius: '8px',
              borderLeft: '4px solid #28a745'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  marginRight: '10px',
                  color: '#28a745'
                }}>
                  📁
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#155724' }}>
                    Файл: {fileName}
                  </div>
                  <div style={{ fontSize: '14px', color: '#155724' }}>
                    {carsArray.length} машин загружено для обработки
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setCarsArray([]);
                  setFileName('');
                  setUploadProgress(0);
                  setMessage('🗑️ Загрузка отменена. Вы можете загрузить новый файл.');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc3545',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px',
                  borderRadius: '4px',
                  transition: 'all 0.3s'
                }}
                title="Отменить загрузку файла"
              >
                ×
              </button>
            </div>

            {/* Прогресс бар */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '8px' 
              }}>
                <span style={{ fontWeight: '600', color: '#495057' }}>
                  Прогресс загрузки
                </span>
                <span style={{ fontWeight: '600', color: '#28a745' }}>
                  {currentIndex + 1}/{carsArray.length} ({uploadProgress}%)
                </span>
              </div>
              <div style={{ 
                height: '10px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '5px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  backgroundColor: '#28a745',
                  width: `${uploadProgress}%`,
                  transition: 'width 0.3s',
                  borderRadius: '5px'
                }}></div>
              </div>
            </div>

            {/* Карточка текущей машины */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#f0f8ff',
                borderRadius: '8px',
                borderLeft: '4px solid #007bff'
              }}>
                <div style={{
                  fontSize: '24px',
                  marginRight: '10px',
                  color: '#007bff'
                }}>
                  📤
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#004085' }}>
                    Шаг {currentIndex + 1} из {carsArray.length}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#004085' }}>
                    <strong>Добавляете фото для:</strong>
                  </p>
                </div>
              </div>
              
              {renderCarCard(currentBulkCar)}
              
              <div style={{ 
                marginTop: '10px', 
                padding: '10px',
                backgroundColor: '#fff3cd',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#856404'
              }}>
                <strong>⚠️ Внимание:</strong> Добавьте фото именно для этой машины перед загрузкой
              </div>
            </div>

            {/* Загрузка фото */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '10px', 
                fontWeight: '600', 
                color: '#495057',
                fontSize: '16px'
              }}>
                📸 Добавьте фото для этой машины
              </label>
              
              <input 
                id="bulk-file-input"
                type="file" 
                accept="image/*" 
                multiple 
                onChange={e => setBulkPhotos([...bulkPhotos, ...Array.from(e.target.files)])}
                style={{ 
                  marginBottom: '15px',
                  padding: '12px',
                  width: '100%',
                  border: '2px dashed #28a745',
                  borderRadius: '8px',
                  backgroundColor: '#f0fff4',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              />
              
              {bulkPhotos.length > 0 ? (
                <div style={{ 
                  backgroundColor: '#d4edda', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '15px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px', marginRight: '10px', color: '#155724' }}>✅</span>
                    <strong style={{ color: '#155724' }}>Выбрано {bulkPhotos.length} фото:</strong>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '10px',
                    marginTop: '10px'
                  }}>
                    {bulkPhotos.map((p, i) => (
                      <div 
                        key={i}
                        style={{ 
                          backgroundColor: '#fff',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#155724',
                          border: '1px solid #c3e6cb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          maxWidth: '200px'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>🖼️</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            {(p.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          onClick={() => setBulkPhotos(bulkPhotos.filter((_, idx) => idx !== i))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc3545',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '0 5px'
                          }}
                          title="Удалить это фото"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '20px', marginRight: '10px', color: '#856404' }}>⚠️</span>
                  <div>
                    <strong style={{ color: '#856404' }}>Фото не выбраны</strong>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#856404' }}>
                      Пожалуйста, добавьте хотя бы одно фото для текущей машины
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Кнопки управления */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={handleBulkUploadMedia} 
                style={{ 
                  flex: 1,
                  padding: '12px 20px', 
                  backgroundColor: isAuthenticated && bulkPhotos.length > 0 ? '#28a745' : '#6c757d',
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: isAuthenticated && bulkPhotos.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                disabled={!isAuthenticated || bulkPhotos.length === 0 || isLoading}
                onMouseEnter={e => isAuthenticated && bulkPhotos.length > 0 && (e.target.style.backgroundColor = '#218838')}
                onMouseLeave={e => isAuthenticated && bulkPhotos.length > 0 && (e.target.style.backgroundColor = '#28a745')}
              >
                {isLoading ? (
                  <>
                    <span>⏳</span>
                    Загрузка...
                  </>
                ) : !isAuthenticated ? (
                  <>
                    <span>🔒</span>
                    Введите пароль
                  </>
                ) : bulkPhotos.length === 0 ? (
                  <>
                    <span>⚠️</span>
                    Добавьте фото
                  </>
                ) : currentIndex + 1 === carsArray.length ? (
                  <>
                    <span>✅</span>
                    Завершить загрузку
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Загрузить и продолжить
                  </>
                )}
              </button>
              
              <button 
                onClick={() => {
                  setCarsArray([]);
                  setBulkPhotos([]);
                  setCurrentIndex(0);
                  setUploadProgress(0);
                  setFileName('');
                  setMessage('❌ Пакетная загрузка отменена');
                }}
                style={{ 
                  padding: '12px 20px', 
                  backgroundColor: '#6c757d',
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={e => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={e => e.target.style.backgroundColor = '#6c757d'}
              >
                <span>❌</span>
                Отмена
              </button>
            </div>

            {/* Информация о следующей машине */}
            {currentIndex + 1 < carsArray.length && (
              <div style={{ 
                marginTop: '25px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #6c757d'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ 
                    fontSize: '20px', 
                    marginRight: '10px',
                    color: '#6c757d'
                  }}>
                    ⏭️
                  </span>
                  <h4 style={{ margin: 0, color: '#495057' }}>
                    Следующая машина в очереди:
                  </h4>
                </div>
                {renderCarCard(carsArray[currentIndex + 1])}
                <div style={{ 
                  marginTop: '10px',
                  fontSize: '13px',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  После загрузки текущей машины вы перейдете к этой
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Улучшенный список всех машин с фильтрами */}
      <div style={{ flexBasis: '100%', marginTop: '30px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px', 
          flexWrap: 'wrap', 
          gap: '15px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>
              🚘 Все машины на сервере 
              <span style={{ 
                backgroundColor: '#007bff',
                color: 'white',
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '14px',
                marginLeft: '10px'
              }}>
                {filteredCars.length}
              </span>
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
              Всего машин: {allCars.length} | Отфильтровано: {filteredCars.length}
            </p>
            <button 
              onClick={fetchAllCars}
              style={{
                marginTop: '10px',
                padding: '8px 15px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Обновление...' : '🔄 Обновить список'}
            </button>
          </div>
          
          {/* Фильтры */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Поиск по марке или модели..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  padding: '10px 15px 10px 40px', 
                  borderRadius: '8px', 
                  border: '1px solid #ced4da',
                  width: '220px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <span style={{ 
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c757d'
              }}>
                🔍
              </span>
            </div>
            
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                placeholder="Макс. цена (€)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{ 
                  padding: '10px 15px 10px 40px', 
                  borderRadius: '8px', 
                  border: '1px solid #ced4da',
                  width: '160px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <span style={{ 
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c757d'
              }}>
                💰
              </span>
            </div>
            
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{ 
                padding: '10px 15px', 
                borderRadius: '8px', 
                border: '1px solid #ced4da',
                minWidth: '160px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Все марки</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            
            <button
              onClick={() => {
                setSearchTerm('');
                setMaxPrice('');
                setSelectedBrand('');
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#5a6268'}
              onMouseLeave={e => e.target.style.backgroundColor = '#6c757d'}
            >
              🔄 Сбросить
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '50px 20px', 
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>
              ⏳
            </div>
            <p>Загрузка машин с сервера...</p>
          </div>
        ) : filteredCars.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '25px' 
          }}>
            {filteredCars.map((car, index) => (
              <div 
                key={car._id || car.id || index} 
                style={{ 
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  backgroundColor: '#fff',
                  transition: 'transform 0.3s, box-shadow 0.3s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
              >
                {car.mediaUrlPhoto && car.mediaUrlPhoto.length > 0 && (
                  <div style={{ position: 'relative', height: '200px' }}>
                    <img 
                      src={car.mediaUrlPhoto[0]} 
                      alt={`${car.brand} ${car.model}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {car.mediaUrlPhoto.length} фото
                    </div>
                  </div>
                )}
                
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>
                        {car.brand} {car.model}
                      </h3>
                      <span style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {car.yearOfManufacture}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '10px',
                      fontSize: '14px',
                      color: '#495057'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>💰</span>
                        <strong>{car.price?.toLocaleString()} €</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🛣️</span>
                        <span>{car.mileage?.toLocaleString()} км</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>⚙️</span>
                        <span>{car.engineDisplacement} л</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>⛽</span>
                        <span>{car.fuelType}</span>
                      </div>
                    </div>
                  </div>

                  {car.mediaUrlVideo && (
                    <div style={{ 
                      marginBottom: '15px', 
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px'
                    }}>
                      <a 
                        href={car.mediaUrlVideo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '8px',
                          color: '#E1306C', 
                          textDecoration: 'none',
                          fontWeight: '500',
                          fontSize: '14px'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>📹</span>
                        Instagram видео
                      </a>
                    </div>
                  )}

                  <button 
                    onClick={() => handleDelete(car._id || car.id)} 
                    style={{ 
                      width: '100%',
                      backgroundColor: isAuthenticated ? '#dc3545' : '#6c757d',
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    disabled={!isAuthenticated || isLoading}
                    onMouseEnter={e => isAuthenticated && (e.target.style.backgroundColor = '#c82333')}
                    onMouseLeave={e => isAuthenticated && (e.target.style.backgroundColor = '#dc3545')}
                  >
                    {isLoading ? (
                      <>
                        <span>⏳</span>
                        Загрузка...
                      </>
                    ) : isAuthenticated ? (
                      <>
                        <span>🗑️</span>
                        Удалить машину
                      </>
                    ) : (
                      <>
                        <span>🔒</span>
                        Введите пароль
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '50px 20px', 
            color: '#666',
            border: '2px dashed #dee2e6',
            borderRadius: '12px',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', color: '#adb5bd' }}>
              {allCars.length === 0 ? '🚗' : '🔍'}
            </div>
            <h3 style={{ color: '#6c757d', marginBottom: '10px' }}>
              {allCars.length === 0 ? 'На сервере пока нет машин' : 'Машины по вашему запросу не найдены'}
            </h3>
            <p style={{ color: '#adb5bd' }}>
              {allCars.length === 0 
                ? 'Начните добавлять машины через формы выше' 
                : 'Попробуйте изменить параметры фильтрации'
              }
            </p>
          </div>
        )}
      </div>

      {message && (
        <div style={{ 
          flexBasis: '100%',
          marginTop: '20px'
        }}>
          <div style={{ 
            padding: '15px 20px', 
            borderRadius: '8px',
            backgroundColor: message.includes('✅') || message.includes('🎉') 
              ? '#d4edda' 
              : message.includes('❌') || message.includes('Ошибка')
              ? '#f8d7da'
              : '#fff3cd',
            color: message.includes('✅') || message.includes('🎉')
              ? '#155724'
              : message.includes('❌') || message.includes('Ошибка')
              ? '#721c24'
              : '#856404',
            borderLeft: `4px solid ${
              message.includes('✅') || message.includes('🎉') 
                ? '#28a745' 
                : message.includes('❌') || message.includes('Ошибка')
                ? '#dc3545'
                : '#ffc107'
            }`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>
              {message.includes('✅') || message.includes('🎉') ? '✅' : 
               message.includes('❌') || message.includes('Ошибка') ? '❌' : '⚠️'}
            </span>
            <div style={{ flex: 1 }}>
              <strong>
                {message.includes('✅') || message.includes('🎉') ? 'Успешно!' : 
                 message.includes('❌') || message.includes('Ошибка') ? 'Ошибка!' : 'Внимание!'}
              </strong>
              <div style={{ marginTop: '5px', fontSize: '14px' }}>
                {message}
              </div>
            </div>
            <button 
              onClick={() => setMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}