import { io } from "socket.io-client";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const socket = io(API_BASE_URL, {
  withCredentials: true,
  autoConnect: true,
});
