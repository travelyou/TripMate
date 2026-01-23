import axios from 'axios'
import { API_BASE_URL } from './config'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export async function reportBankTransfer({ orderId, last5 }) {
  const { data } = await http.post('/payments/report-bank', { orderId, last5 })
  if (!data?.ok) throw new Error(data?.message || 'reportBankTransfer failed')
  return data
}
