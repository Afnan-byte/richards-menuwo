import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Helpers for tenant-specific paths
const getTenantCollection = (tenantId, colName) => collection(db, 'restaurants', tenantId, colName);
const getTenantDoc = (tenantId, colName, docId) => doc(db, 'restaurants', tenantId, colName, docId);
const getTenantSettingsRef = (tenantId) => doc(db, 'restaurants', tenantId);

// --- CATEGORIES ---
export const getCategories = async (tenantId) => {
  if (!tenantId) return [];
  const q = query(getTenantCollection(tenantId, 'categories'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveCategory = async (tenantId, category) => {
  const docRef = await addDoc(getTenantCollection(tenantId, 'categories'), {
    ...category,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const deleteCategory = async (tenantId, id) => {
  await deleteDoc(getTenantDoc(tenantId, 'categories', id));
};

// --- MENU ITEMS ---
export const getMenuItems = async (tenantId) => {
  if (!tenantId) return [];
  const q = query(getTenantCollection(tenantId, 'menu'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveMenuItem = async (tenantId, item) => {
  const docRef = await addDoc(getTenantCollection(tenantId, 'menu'), {
    ...item,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const deleteMenuItem = async (tenantId, id) => {
  await deleteDoc(getTenantDoc(tenantId, 'menu', id));
};

// --- ORDERS ---
export const saveOrder = async (tenantId, orderData) => {
  const docRef = await addDoc(getTenantCollection(tenantId, 'orders'), {
    ...orderData,
    status: 'pending',
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const getOrders = async (tenantId) => {
  if (!tenantId) return [];
  const q = query(getTenantCollection(tenantId, 'orders'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToOrders = (tenantId, callback) => {
  if (!tenantId) return () => {};
  const q = query(getTenantCollection(tenantId, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  });
};

export const updateOrderStatus = async (tenantId, id, status) => {
  const orderRef = getTenantDoc(tenantId, 'orders', id);
  await updateDoc(orderRef, {
    status,
    updatedAt: serverTimestamp()
  });
};

// --- PURCHASES ---
export const savePurchase = async (tenantId, purchaseData) => {
  const docRef = await addDoc(getTenantCollection(tenantId, 'purchases'), {
    ...purchaseData,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const getPurchases = async (tenantId) => {
  if (!tenantId) return [];
  const q = query(getTenantCollection(tenantId, 'purchases'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToPurchases = (tenantId, callback) => {
  if (!tenantId) return () => {};
  const q = query(getTenantCollection(tenantId, 'purchases'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(purchases);
  });
};

export const deletePurchase = async (tenantId, id) => {
  await deleteDoc(getTenantDoc(tenantId, 'purchases', id));
};

// --- ROOMS ---
export const getRooms = async (tenantId) => {
  if (!tenantId) return [];
  const q = query(getTenantCollection(tenantId, 'rooms'));
  const snapshot = await getDocs(q);
  const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Sort on client side to ensure rooms without createdAt are not hidden
  return rooms.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
};

export const saveRoom = async (tenantId, roomData) => {
  const docRef = await addDoc(getTenantCollection(tenantId, 'rooms'), {
    ...roomData,
    createdAt: serverTimestamp()
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() };
};

export const deleteRoom = async (tenantId, id) => {
  await deleteDoc(getTenantDoc(tenantId, 'rooms', id));
};

// --- SETTINGS ---
export const getSettings = async (tenantId) => {
  if (!tenantId) return { whatsappNumber: '' };
  const docSnap = await getDoc(getTenantSettingsRef(tenantId));
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return { whatsappNumber: '' };
  }
};

export const saveSettings = async (tenantId, settingsData) => {
  await setDoc(getTenantSettingsRef(tenantId), {
    ...settingsData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};
