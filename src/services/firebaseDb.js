import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Collection References
const ordersCol = collection(db, 'orders');
const purchasesCol = collection(db, 'purchases');
const categoriesCol = collection(db, 'categories');
const menuCol = collection(db, 'menu');
const roomsCol = collection(db, 'rooms');
const settingsDocRef = doc(db, 'settings', 'global');

// --- CATEGORIES ---
export const getCategories = async () => {
  const q = query(categoriesCol);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveCategory = async (category) => {
  const docRef = await addDoc(categoriesCol, {
    ...category,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const deleteCategory = async (id) => {
  await deleteDoc(doc(db, 'categories', id));
};

// --- MENU ITEMS ---
export const getMenuItems = async () => {
  const q = query(menuCol);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveMenuItem = async (item) => {
  const docRef = await addDoc(menuCol, {
    ...item,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const deleteMenuItem = async (id) => {
  await deleteDoc(doc(db, 'menu', id));
};

// --- ORDERS ---
export const saveOrder = async (orderData) => {
  const docRef = await addDoc(ordersCol, {
    ...orderData,
    status: 'pending',
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const getOrders = async () => {
  const q = query(ordersCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- PURCHASES ---
export const savePurchase = async (purchaseData) => {
  const docRef = await addDoc(purchasesCol, {
    ...purchaseData,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const getPurchases = async () => {
  const q = query(purchasesCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deletePurchase = async (id) => {
  await deleteDoc(doc(db, 'purchases', id));
};

// --- ROOMS ---
export const getRooms = async () => {
  const q = query(roomsCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveRoom = async (roomData) => {
  const docRef = await addDoc(roomsCol, {
    ...roomData,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const deleteRoom = async (id) => {
  await deleteDoc(doc(db, 'rooms', id));
};

// --- SETTINGS ---
export const getSettings = async () => {
  const docSnap = await getDoc(settingsDocRef);
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return { whatsappNumber: '' };
  }
};

export const saveSettings = async (settingsData) => {
  await setDoc(settingsDocRef, {
    ...settingsData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};
