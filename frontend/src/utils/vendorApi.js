// src/services/vendorApi.js
import {API_BASE_URL} from "./api"; // your axios instance

export const getVendorDetails = async () => {
    const res = await fetch(`${API_BASE_URL}/api/vendor/details`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
    });
  return res.data;
};

export const getVendorSummary =async () => {
    const res = await fetch(`${API_BASE_URL}/api/vendor/vendor-summary`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
    });
    if (!res.ok) {
        throw new Error('Failed to fetch vendor summary');
    }
    const data = await res.json();
    console.log('Vendor Summary:', data);
    return data.summary || '';
}
