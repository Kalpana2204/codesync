import axios from "axios";

const API = axios.create({
  baseURL:"https://codesync-production-ccd9.up.railway.app/api",
  withCredentials: true,
});

export default API;