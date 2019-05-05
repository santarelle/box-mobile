import axios from 'axios';

const api = axios.create({
  baseURL: 'https://msj-box-backend.herokuapp.com'
});

export default api;
