import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error("Failed to refresh profile", err);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              setUserProfile(userDoc.data());
            } else {
              // If creation time equals last sign in time, this is a brand new registration.
              // We should not aggressively fallback here because Register component is about to setDoc.
              const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
              if (!isNewUser) {
                const shortCode = user.uid.substring(0, 6).toUpperCase();
                const newProfile = {
                  role: 'admin',
                  restaurantId: shortCode,
                  email: user.email
                };
                await setDoc(doc(db, 'users', user.uid), newProfile);
                setUserProfile(newProfile);
              } else {
                setUserProfile(null); // Register component will call refreshProfile after setDoc
              }
            }
          } catch (err) {
            console.error("Failed to fetch user profile", err);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error("Firebase auth error (likely dummy keys):", error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
