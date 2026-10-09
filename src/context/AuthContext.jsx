import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("esp_user");
    const token = localStorage.getItem("esp_access_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
      client
        .get("/auth/me")
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem("esp_user", JSON.stringify(data));
        })
        .catch(() => {
          localStorage.removeItem("esp_access_token");
          localStorage.removeItem("esp_refresh_token");
          localStorage.removeItem("esp_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const persistSession = (data) => {
    localStorage.setItem("esp_access_token", data.access_token);
    localStorage.setItem("esp_refresh_token", data.refresh_token);
    localStorage.setItem("esp_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    persistSession(data);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await client.post("/auth/register", payload);
    persistSession(data);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget: revoke server-side regardless of whether this
    // resolves, since we clear local state either way. This is what
    // actually invalidates the token (see backend token_version) —
    // clearing localStorage alone would only affect this browser tab.
    client.post("/auth/logout").catch(() => {});
    localStorage.removeItem("esp_access_token");
    localStorage.removeItem("esp_refresh_token");
    localStorage.removeItem("esp_user");
    setUser(null);
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("esp_user", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

