import api from './api';

export const addCar = async ({
  brand,
  model,
  yearOfManufacture,
  engineDisplacement,
  fuelType,
  gearbox,
  mileage,
  price,
  mediaUrlVideo,
  photos,
}) => {
  try {
    if (!photos || !photos.length) {
      throw new Error('Необходимо добавить хотя бы одно фото.');
    }

    const formData = new FormData();

    formData.append('brand', brand);
    formData.append('model', model);
    formData.append('yearOfManufacture', yearOfManufacture);
    formData.append('engineDisplacement', engineDisplacement);
    formData.append('fuelType', fuelType);
    formData.append('gearbox', gearbox);
    formData.append('mileage', mileage);
    formData.append('price', price);
    
    if (mediaUrlVideo) {
      formData.append('mediaUrlVideo', mediaUrlVideo);
    }

    photos.forEach((photo) => formData.append('mediaUrlPhoto', photo));

    const response = await api.post('/cars', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  } catch (err) {
    console.error(err);
    return { error: err.message || 'Failed to add car' };
  }
};

export const deleteCar = async (id) => {
  try {
    const response = await api.delete('/cars', { data: { id } });
    return response.data;
  } catch (err) {
    console.error(err);
    return { error: err.message || 'Failed to delete car' };
  }
};

export const addCarsBulk = async (cars) => {
  const results = [];
  for (const car of cars) {
    const { photos, ...rest } = car;
    const formData = new FormData();
    Object.entries(rest).forEach(([key, value]) => formData.append(key, value));
    
    photos.forEach((photo) => formData.append('mediaUrlPhoto', photo));

    try {
      const res = await api.post('/cars/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      results.push(res.data);
    } catch (err) {
      results.push({ error: err.message });
    }
  }
  return results;
};