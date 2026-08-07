import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc, setDoc, updateDoc, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';

// Helpers for tenant-specific paths
const getTenantCollection = (tenantId, colName) => collection(db, 'restaurants', tenantId, colName);
const getTenantDoc = (tenantId, colName, docId) => doc(db, 'restaurants', tenantId, colName, docId);
const getTenantSettingsRef = (tenantId) => doc(db, 'restaurants', tenantId);

// Helper to resolve tenant ID variations (case-sensitivity, shortCode vs UID lookup)
export const resolveTenantId = async (tenantId) => {
  if (!tenantId) return '';

  // 1. Try exact tenantId (e.g. "WJS09F")
  try {
    const directMenuSnap = await getDocs(query(getTenantCollection(tenantId, 'menu')));
    if (!directMenuSnap.empty) {
      return tenantId;
    }
  } catch (e) {
    console.warn("Direct tenant menu check notice:", e);
  }

  // 2. Try uppercase tenantId (e.g. "wjs09f" -> "WJS09F")
  const upperTenantId = tenantId.toUpperCase();
  if (upperTenantId !== tenantId) {
    try {
      const upperMenuSnap = await getDocs(query(getTenantCollection(upperTenantId, 'menu')));
      if (!upperMenuSnap.empty) {
        return upperTenantId;
      }
    } catch (e) {
      console.warn("Upper tenant menu check notice:", e);
    }
  }

  // 3. Search users collection by restaurantId field or document ID (UID)
  try {
    const usersRef = collection(db, 'users');

    const q1 = query(usersRef, where('restaurantId', '==', upperTenantId));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return snap1.docs[0].data().restaurantId || upperTenantId;
    }

    const q2 = query(usersRef, where('restaurantId', '==', tenantId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return snap2.docs[0].data().restaurantId || tenantId;
    }

    const userDoc = await getDoc(doc(db, 'users', tenantId));
    if (userDoc.exists()) {
      return userDoc.data().restaurantId || tenantId;
    }
  } catch (e) {
    console.warn("User lookup for tenantId notice:", e);
  }

  return upperTenantId;
};

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

// --- WHATSAPP NUMBER FORMATTER ---
export const formatWhatsAppNumber = (rawNumber) => {
  if (!rawNumber) return '';
  let digits = rawNumber.toString().replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Remove leading zeros
  digits = digits.replace(/^0+/, '');

  // If 10-digit Indian number starting with 6, 7, 8, 9, prepend country code 91
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    digits = '91' + digits;
  }

  return digits;
};

// --- SETTINGS ---
export const getSettings = async (tenantId) => {
  if (!tenantId) return { whatsappNumber: '' };

  const checkDocRef = async (docRef) => {
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.whatsappNumber) return data.whatsappNumber;
      }
    } catch (e) {
      console.warn("Check doc ref notice:", e);
    }
    return null;
  };

  // 1. Check exact tenantId in restaurants
  let foundNumber = await checkDocRef(getTenantSettingsRef(tenantId));
  if (foundNumber) return { whatsappNumber: foundNumber };

  // 2. Check uppercase tenantId in restaurants
  const upperTenantId = tenantId.toUpperCase();
  if (upperTenantId !== tenantId) {
    foundNumber = await checkDocRef(getTenantSettingsRef(upperTenantId));
    if (foundNumber) return { whatsappNumber: foundNumber };
  }

  // 3. Check settings collection (settings/tenantId, settings/global)
  foundNumber = await checkDocRef(doc(db, 'settings', tenantId));
  if (foundNumber) return { whatsappNumber: foundNumber };

  foundNumber = await checkDocRef(doc(db, 'settings', upperTenantId));
  if (foundNumber) return { whatsappNumber: foundNumber };

  foundNumber = await checkDocRef(doc(db, 'settings', 'global'));
  if (foundNumber) return { whatsappNumber: foundNumber };

  // 4. Search users collection by restaurantId or document ID (UID)
  try {
    const usersRef = collection(db, 'users');

    const q1 = query(usersRef, where('restaurantId', '==', upperTenantId));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const uData = snap1.docs[0].data();
      if (uData.whatsappNumber) return { whatsappNumber: uData.whatsappNumber };
      foundNumber = await checkDocRef(doc(db, 'restaurants', snap1.docs[0].id));
      if (foundNumber) return { whatsappNumber: foundNumber };
    }

    const q2 = query(usersRef, where('restaurantId', '==', tenantId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const uData = snap2.docs[0].data();
      if (uData.whatsappNumber) return { whatsappNumber: uData.whatsappNumber };
      foundNumber = await checkDocRef(doc(db, 'restaurants', snap2.docs[0].id));
      if (foundNumber) return { whatsappNumber: foundNumber };
    }

    const userDocRef = doc(db, 'users', tenantId);
    const uSnap = await getDoc(userDocRef);
    if (uSnap.exists()) {
      const uData = uSnap.data();
      if (uData.whatsappNumber) return { whatsappNumber: uData.whatsappNumber };
      if (uData.restaurantId) {
        foundNumber = await checkDocRef(getTenantSettingsRef(uData.restaurantId));
        if (foundNumber) return { whatsappNumber: foundNumber };
      }
    }
  } catch (e) {
    console.warn("Settings user lookup notice:", e);
  }

  // 5. Try resolved tenantId
  try {
    const resolvedId = await resolveTenantId(tenantId);
    if (resolvedId && resolvedId !== tenantId && resolvedId !== upperTenantId) {
      foundNumber = await checkDocRef(getTenantSettingsRef(resolvedId));
      if (foundNumber) return { whatsappNumber: foundNumber };
    }
  } catch (e) {
    console.warn("Settings resolved lookup notice:", e);
  }

  // 6. Global fallback: check if any document in users or restaurants has a whatsappNumber populated
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const d of usersSnap.docs) {
      if (d.data().whatsappNumber) return { whatsappNumber: d.data().whatsappNumber };
    }

    const restSnap = await getDocs(collection(db, 'restaurants'));
    for (const d of restSnap.docs) {
      if (d.data().whatsappNumber) return { whatsappNumber: d.data().whatsappNumber };
    }
  } catch (e) {
    console.warn("Global whatsappNumber fallback check notice:", e);
  }

  return { whatsappNumber: '' };
};

export const saveSettings = async (tenantId, settingsData) => {
  const formattedPhone = settingsData.whatsappNumber ? formatWhatsAppNumber(settingsData.whatsappNumber) : '';
  const payload = {
    ...settingsData,
    whatsappNumber: formattedPhone,
    updatedAt: serverTimestamp()
  };

  // Save globally to settings/global
  try {
    await setDoc(doc(db, 'settings', 'global'), payload, { merge: true });
  } catch (e) {
    console.warn("Save to settings/global notice:", e);
  }

  if (tenantId) {
    await setDoc(getTenantSettingsRef(tenantId), payload, { merge: true });
    await setDoc(doc(db, 'settings', tenantId), payload, { merge: true });

    const upper = tenantId.toUpperCase();
    if (upper !== tenantId) {
      await setDoc(getTenantSettingsRef(upper), payload, { merge: true });
      await setDoc(doc(db, 'settings', upper), payload, { merge: true });
    }
  }

  if (auth.currentUser) {
    try {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, 'restaurants', uid), payload, { merge: true });
      await setDoc(doc(db, 'users', uid), { whatsappNumber: formattedPhone }, { merge: true });
    } catch (e) {
      console.warn("Save user profile settings notice:", e);
    }
  }
};
