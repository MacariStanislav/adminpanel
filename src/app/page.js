'use client';

import { useState, useEffect } from 'react';
import api from '@/utils/api';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Простой пароль
  const ADMIN_PASSWORD = '2072264';
  const brands = ['BMW', 'Mercedes', 'Toyota', 'Volkswagen', 'Dacia', 'Opel', 'Volvo', 'Audi', 'Skoda', 'Peugeot', 'Renault', 'Citroen'];
  const fuelTypes = ['Бензин', 'Дизель', 'Электричество', 'Гибрид'];
  const gearboxes = ['Механика', 'Автомат'];

  // Проверка аутентификации при загрузке
  useEffect(() => { 
    const auth = localStorage.getItem('admin_authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    if (isAuthenticated) {
      fetchAllCars();
    }
  }, [isAuthenticated]);

  // Вход в систему
  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_authenticated', 'true');
      setAdminPassword('');
      showMessage('Успешный вход в систему!', 'success');
    } else {
      showMessage('Неверный пароль', 'error');
    }
  };

  // Выход из системы
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
    showMessage('Вы вышли из системы', 'info');
  };

  // Показать сообщение
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const fetchAllCars = async () => {
  try {
    setIsLoading(true);
    const res = await api.get('/cars');
    const carsData = Array.isArray(res.data) ? res.data : res.data.cars || [];
    
    // ⭐ ПРОСТО ПОКАЗЫВАЕМ ВСЕ МАШИНЫ БЕЗ ФИЛЬТРАЦИИ
    setAllCars(carsData);
    console.log('Загружено машин:', carsData.length);
  } catch (err) {
    console.error(err);
    showMessage('Ошибка при загрузке машин с сервера', 'error');
  } finally {
    setIsLoading(false);
  }
};

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
    if (!singlePhotos.length) { 
      showMessage('Добавьте хотя бы одно фото', 'error'); 
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

      await api.post('/cars', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      await fetchAllCars();
      
      showMessage(`Машина "${singleCar.brand} ${singleCar.model}" добавлена`, 'success');

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
      showMessage(`Ошибка: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension !== 'json' && fileExtension !== 'txt') {
      showMessage('Неверный формат файла. Поддерживаются только JSON и TXT файлы.', 'error');
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
          showMessage('В файле нет валидных данных о машинах', 'error');
          return;
        }

        setCarsArray(validatedData);
        setCurrentIndex(0);
        setBulkPhotos([]);
        setUploadProgress(0);
        
        const skipped = data.length - validatedData.length;
        const skippedMessage = skipped > 0 ? ` (${skipped} невалидных записей пропущено)` : '';
        
        showMessage(`Загружено ${validatedData.length} машин из файла "${file.name}"${skippedMessage}`, 'success');
        
      } catch (error) {
        console.error('Ошибка при чтении файла:', error);
        showMessage('Ошибка при чтении файла. Убедитесь, что файл содержит валидный JSON.', 'error');
      }
    };
    
    reader.onerror = () => {
      showMessage('Ошибка при чтении файла', 'error');
    };
    
    reader.readAsText(file);
  };
const handleBulkUploadMedia = async () => {
  // Защита от повторного нажатия
  if (isUploading) {
    showMessage('Идет загрузка, пожалуйста подождите...', 'info');
    return;
  }
  
  const currentCar = carsArray[currentIndex];
  if (!currentCar) {
    showMessage('Нет данных о машине', 'error');
    return;
  }
  
  if (!bulkPhotos.length) { 
    showMessage('Добавьте хотя бы одно фото для текущей машины', 'error'); 
    return; 
  }

  try {
    setIsUploading(true);
    showMessage(`Загружаю машину "${currentCar.brand} ${currentCar.model}" (${currentIndex + 1}/${carsArray.length})...`, 'info');
    
    const formData = new FormData();
    Object.entries(currentCar).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) {
        formData.append(k, v.toString());
      }
    });
    bulkPhotos.forEach(p => formData.append('mediaUrlPhoto', p));

    await api.post('/cars/bulk', formData, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
    
    const progress = Math.round(((currentIndex + 1) / carsArray.length) * 100);
    setUploadProgress(progress);
    showMessage(`✅ Машина "${currentCar.brand} ${currentCar.model}" успешно загружена (${currentIndex + 1}/${carsArray.length})`, 'success');

    // Очищаем фото ТОЛЬКО ПОСЛЕ УСПЕШНОЙ ЗАГРУЗКИ
    setBulkPhotos([]);

    // Переходим к следующей машине
    if (currentIndex + 1 < carsArray.length) {
      setCurrentIndex(currentIndex + 1);
      showMessage(`Готово! Теперь добавьте фото для следующей машины (${currentIndex + 2}/${carsArray.length})`, 'info');
    } else {
      // Все машины загружены
      await fetchAllCars();
      setCarsArray([]);
      setFileName('');
      setUploadProgress(100);
      showMessage('🎉 Все машины успешно загружены! Файл обработан.', 'success');
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    }
  } catch (err) {
    console.error('Ошибка при bulk добавлении машины:', err);
    showMessage(`❌ Ошибка при загрузке машины: ${err.response?.data?.message || err.message}`, 'error');
  } finally {
    setIsUploading(false);
  }
};
  const handleDelete = async (id) => {
    if (!confirm('Удалить эту машину?')) return;
    
    try {
      await api.delete('/cars', { data: { id } });
      await fetchAllCars();
      showMessage('Машина удалена', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Ошибка при удалении машины', 'error');
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

  // Если не авторизован, показываем страницу входа
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px 30px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)'
            }}>
              <span style={{ fontSize: '36px' }}>🔐</span>
            </div>
            <h1 style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              Административная панель
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px'
            }}>
              Введите пароль для доступа к системе управления
            </p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Пароль администратора
              </label>
              <input 
                type="password" 
                value={adminPassword} 
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{
                  width: '92%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 15px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
                placeholder="Введите пароль"
                autoComplete="off"
              />
            </div>
            
            <button 
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: '600',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Войти в систему
            </button>
          </form>
          
          {message.text && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: message.type === 'success' ? 'rgba(72, 187, 120, 0.2)' : 
                              message.type === 'error' ? 'rgba(245, 101, 101, 0.2)' : 
                              'rgba(59, 130, 246, 0.2)',
              border: `1px solid ${message.type === 'success' ? '#48BB78' : 
                       message.type === 'error' ? '#F56565' : '#4299E1'}`,
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                marginRight: '10px',
                fontSize: '18px'
              }}>
                {message.type === 'success' ? '✅' :
                 message.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <span style={{
                color: message.type === 'success' ? '#48BB78' : 
                       message.type === 'error' ? '#F56565' : 
                       '#4299E1',
                fontSize: '14px'
              }}>
                {message.text}
              </span>
            </div>
          )}
          
          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'center'
          }}>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '12px'
            }}>
              © 2024 Автосалон • Защищенный доступ
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Основной интерфейс администратора
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f7fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '15px 20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '20px' }}>🚗</span>
              </div>
              <div>
                <h1 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#2d3748',
                  margin: 0
                }}>
                  Панель управления автосалоном
                </h1>
                <p style={{
                  fontSize: '13px',
                  color: '#718096',
                  margin: '5px 0 0 0'
                }}>
                  Авторизованы как администратор
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #f56565 0%, #ed64a6 100%)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <span>🚪</span>
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '30px 20px'
      }}>
        {/* Сообщение */}
        {message.text && (
          <div style={{
            marginBottom: '25px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: message.type === 'success' ? '#f0fff4' : 
                            message.type === 'error' ? '#fff5f5' : 
                            '#ebf8ff',
            border: `1px solid ${message.type === 'success' ? '#c6f6d5' : 
                     message.type === 'error' ? '#fed7d7' : 
                     '#bee3f8'}`,
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{
              marginRight: '12px',
              fontSize: '20px'
            }}>
              {message.type === 'success' ? '✅' :
               message.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span style={{
              color: message.type === 'success' ? '#276749' : 
                     message.type === 'error' ? '#9b2c2c' : 
                     '#2c5282',
              fontSize: '15px'
            }}>
              {message.text}
            </span>
          </div>
        )}

        {/* Основные секции */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          marginBottom: '40px'
        }}>
          {/* Добавить одну машину */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#2d3748',
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '10px' }}>🚗</span>
              Добавить одну машину
            </h2>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Марка *
                  </label>
                  <select 
                    name="brand" 
                    value={singleCar.brand} 
                    onChange={handleSingleChange}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                  >
                    <option value="">Выберите марку</option>
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Модель *
                  </label>
                  <input 
                    name="model" 
                    type="text" 
                    placeholder="Модель"
                    value={singleCar.model} 
                    onChange={handleSingleChange}
                    style={{
                      width: '90%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Год выпуска *
                  </label>
                  <input 
                    name="yearOfManufacture" 
                    type="number" 
                    min="1990" 
                    max="2024"
                    value={singleCar.yearOfManufacture} 
                    onChange={handleSingleChange}
                    style={{
                      width: '90%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Объем двигателя (л) *
                  </label>
                  <input 
                    name="engineDisplacement" 
                    type="number" 
                    step="0.1"
                    placeholder="2.0"
                    value={singleCar.engineDisplacement} 
                    onChange={handleSingleChange}
                    style={{
                      width: '90%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Тип топлива *
                  </label>
                  <select 
                    name="fuelType" 
                    value={singleCar.fuelType} 
                    onChange={handleSingleChange}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Выберите тип</option>
                    {fuelTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Коробка передач *
                  </label>
                  <select 
                    name="gearbox" 
                    value={singleCar.gearbox} 
                    onChange={handleSingleChange}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Выберите КПП</option>
                    {gearboxes.map(gearbox => (
                      <option key={gearbox} value={gearbox}>{gearbox}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Пробег (км) *
                  </label>
                  <input 
                    name="mileage" 
                    type="number" 
                    placeholder="15000"
                    value={singleCar.mileage} 
                    onChange={handleSingleChange}
                    style={{
                      width: '90%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Цена (€) *
                  </label>
                  <input 
                    name="price" 
                    type="number" 
                    placeholder="25000"
                    value={singleCar.price} 
                    onChange={handleSingleChange}
                    style={{
                      width: '90%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '8px'
                }}>
                  Ссылка на Instagram
                </label>
                <input 
                  name="mediaUrlVideo" 
                  type="url" 
                  placeholder="https://www.instagram.com/p/DRooCIVjQq5/"
                  value={singleCar.mediaUrlVideo} 
                  onChange={handleSingleChange}
                  style={{
                    width: '90%',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '8px'
                }}>
                  📸 Фотографии (обязательно хотя бы 1)
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={e => setSinglePhotos([...singlePhotos, ...Array.from(e.target.files)])}
                  style={{
                    width: '90%',
                    border: '2px dashed #cbd5e0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '10px',
                    cursor: 'pointer'
                  }}
                />
                {singlePhotos.length > 0 && (
                  <div style={{
                    backgroundColor: '#f0fff4',
                    border: '1px solid #c6f6d5',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#276749',
                      margin: '0 0 5px 0'
                    }}>
                      Выбрано {singlePhotos.length} фото
                    </p>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '12px',
                      color: '#276749'
                    }}>
                      {singlePhotos.slice(0, 3).map((p, i) => (
                        <li key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {i + 1}. {p.name} ({(p.size / 1024).toFixed(1)} KB)
                        </li>
                      ))}
                      {singlePhotos.length > 3 && (
                        <li>... и ещё {singlePhotos.length - 3} фото</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSingleSubmit}
                disabled={!singleCar.brand || !singleCar.model || !singlePhotos.length || isLoading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  padding: '15px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '16px',
                  cursor: !singleCar.brand || !singleCar.model || !singlePhotos.length || isLoading ? 'not-allowed' : 'pointer',
                  opacity: !singleCar.brand || !singleCar.model || !singlePhotos.length || isLoading ? 0.5 : 1,
                  transition: 'all 0.3s'
                }}
              >
                {isLoading ? '⏳ Загрузка...' : '✅ Добавить машину'}
              </button>
            </div>
          </div>

          {/* Пакетная загрузка */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#2d3748',
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '10px' }}>📦</span>
              Пакетная загрузка машин
            </h2>
            
            {!carsArray.length ? (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: '48px', color: '#e2e8f0', marginBottom: '15px' }}>
                  📄
                </div>
                <p style={{ color: '#718096', marginBottom: '25px' }}>
                  Загрузите JSON или TXT файл с данными машин
                </p>
                
                <div style={{
                  backgroundColor: '#f7fafc',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '25px'
                }}>
                  <h4 style={{
                    fontWeight: '600',
                    color: '#4a5568',
                    margin: '0 0 15px 0'
                  }}>
                    Формат файла:
                  </h4>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#48bb78', marginRight: '10px' }}>✓</span>
                      <span style={{ fontSize: '14px', color: '#718096' }}>Форматы: .json, .txt</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#48bb78', marginRight: '10px' }}>✓</span>
                      <span style={{ fontSize: '14px', color: '#718096' }}>Массив объектов</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#48bb78', marginRight: '10px' }}>✓</span>
                      <span style={{ fontSize: '14px', color: '#718096' }}>Обязательные поля: brand, model, price</span>
                    </div>
                  </div>
                </div>
                
                <label style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s'
                }}>
                  <span style={{ marginRight: '8px' }}>📁</span>
                  Выбрать файл
                  <input 
                    type="file" 
                    accept=".json,.txt" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            ) : (
              <>
                {/* Информация о файле */}
                <div style={{
                  background: 'linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)',
                  border: '1px solid #c6f6d5',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '25px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#48bb78',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '15px'
                      }}>
                        <span style={{ fontSize: '20px', color: 'white' }}>📁</span>
                      </div>
                      <div>
                        <h4 style={{
                          fontWeight: 'bold',
                          color: '#2d3748',
                          margin: '0 0 5px 0'
                        }}>
                          {fileName}
                        </h4>
                        <p style={{
                          color: '#718096',
                          margin: 0,
                          fontSize: '14px'
                        }}>
                          {carsArray.length} машин • Шаг {currentIndex + 1} из {carsArray.length}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCarsArray([]);
                        setFileName('');
                        setUploadProgress(0);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#718096',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '5px',
                        borderRadius: '5px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Прогресс бар */}
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#718096', marginBottom: '5px' }}>
                      <span>Прогресс загрузки</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                          width: `${uploadProgress}%`,
                          transition: 'width 0.3s'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Текущая машина */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#4299e1',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <span style={{ fontSize: '18px' }}>🚗</span>
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 'bold', color: '#2d3748', margin: '0 0 5px 0' }}>
                        Текущая машина
                      </h3>
                      <p style={{ color: '#718096', margin: 0, fontSize: '14px' }}>
                        Шаг {currentIndex + 1} из {carsArray.length}
                      </p>
                    </div>
                  </div>
                  
                  {renderCarCard(currentBulkCar)}
                </div>

                {/* Загрузка фото */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '12px'
                  }}>
                    📸 Добавьте фото для этой машины
                  </label>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={e => setBulkPhotos([...bulkPhotos, ...Array.from(e.target.files)])}
                    style={{
                      width: '100%',
                      border: '2px dashed #cbd5e0',
                      borderRadius: '10px',
                      padding: '20px',
                      marginBottom: '15px',
                      cursor: 'pointer'
                    }}
                  />
                  
                  {bulkPhotos.length > 0 && (
                    <div style={{
                      backgroundColor: '#f0fff4',
                      border: '1px solid #c6f6d5',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '15px'
                    }}>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#276749',
                        margin: 0
                      }}>
                        Фото для загрузки: {bulkPhotos.length}
                      </p>
                    </div>
                  )}

<button 
  onClick={handleBulkUploadMedia}
  disabled={!bulkPhotos.length || isLoading || isUploading}
  style={{
    width: '100%',
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    color: 'white',
    fontWeight: '600',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '16px',
    cursor: !bulkPhotos.length || isLoading || isUploading ? 'not-allowed' : 'pointer',
    opacity: !bulkPhotos.length || isLoading || isUploading ? 0.5 : 1,
    transition: 'all 0.3s'
  }}
>
  {isUploading ? '⏳ Загрузка...' : 
   isLoading ? '⏳ Обработка...' : 
   currentIndex + 1 === carsArray.length ? '✅ Завершить загрузку' : 
   '📤 Загрузить и перейти к следующей'}
</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Список всех машин */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '25px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginBottom: '25px'
          }}>
            <div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#2d3748',
                margin: '0 0 10px 0'
              }}>
                Все машины на сервере
              </h2>
              <p style={{
                color: '#718096',
                margin: 0
              }}>
                Всего: {allCars.length} • Отфильтровано: {filteredCars.length}
              </p>
            </div>
            
            <button 
              onClick={fetchAllCars}
              disabled={isLoading}
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(135deg, #718096 0%, #4a5568 100%)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.3s'
              }}
            >
              {isLoading ? '⏳ Обновление...' : '🔄 Обновить список'}
            </button>
          </div>

          {/* Фильтры */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '25px'
          }}>
            <div>
              <input
                type="text"
                placeholder="Поиск по марке или модели..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div>
              <input
                type="number"
                placeholder="Макс. цена (€)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Все марки</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Список машин */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#4299e1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '20px'
              }}></div>
              <p style={{ color: '#718096' }}>Загрузка машин...</p>
            </div>
          ) : filteredCars.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {filteredCars.map((car, index) => (
                <div key={car._id || index} style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}>
                  {car.mediaUrlPhoto?.[0] && (
                    <div style={{ position: 'relative', height: '180px' }}>
                      <img 
                        src={car.mediaUrlPhoto[0]} 
                        alt={`${car.brand} ${car.model}`}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '15px',
                        fontSize: '11px'
                      }}>
                        {car.mediaUrlPhoto?.length || 0} фото
                      </div>
                    </div>
                  )}
                  
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', margin: '0 0 5px 0' }}>
                          {car.brand} {car.model}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#38a169' }}>
                            {car.price.toLocaleString()} €
                          </span>
                          <span style={{ color: '#718096' }}>•</span>
                          <span style={{ color: '#718096' }}>{car.mileage.toLocaleString()} км</span>
                        </div>
                      </div>
                      <span style={{
                        backgroundColor: '#bee3f8',
                        color: '#2c5282',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '3px 10px',
                        borderRadius: '15px'
                      }}>
                        {car.yearOfManufacture}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '10px',
                      marginBottom: '20px',
                      fontSize: '14px',
                      color: '#4a5568'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>⚙️</span>
                        <span>{car.engineDisplacement} л</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>⛽</span>
                        <span>{car.fuelType}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>🔧</span>
                        <span>{car.gearbox}</span>
                      </div>
                      {car.mediaUrlVideo && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <a 
                            href={car.mediaUrlVideo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#e1306c',
                              textDecoration: 'none'
                            }}
                          >
                            <span style={{ marginRight: '8px' }}>📹</span>
                            <span>Instagram видео</span>
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(car._id || car.id)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #f56565 0%, #ed64a6 100%)',
                        color: 'white',
                        fontWeight: '600',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      Удалить машину
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div style={{ fontSize: '48px', color: '#e2e8f0', marginBottom: '20px' }}>
                {allCars.length === 0 ? '🚗' : '🔍'}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#4a5568', marginBottom: '10px' }}>
                {allCars.length === 0 ? 'Машин пока нет' : 'Машины не найдены'}
              </h3>
              <p style={{ color: '#718096' }}>
                {allCars.length === 0 
                  ? 'Начните добавлять машины через форму выше' 
                  : 'Попробуйте изменить параметры поиска'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '50px',
        borderTop: '1px solid #e2e8f0',
        padding: '25px 0',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <p style={{ color: '#718096', fontSize: '14px' }}>
            © 2024 Панель управления автосалоном • Защищенный доступ
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}