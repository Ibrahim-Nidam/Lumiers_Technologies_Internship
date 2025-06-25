"use client";

import { useState, useCallback } from "react";
import UserForm from "./UserForm";
import apiClient from "../utils/axiosConfig"; // ← your configured axios instance

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent",
    cnie: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Password validation helpers
  const validatePassword = useCallback((password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    const missing = [];
    if (!requirements.length) missing.push("au moins 8 caractères");
    if (!requirements.uppercase) missing.push("une majuscule");
    if (!requirements.number) missing.push("un chiffre");
    if (!requirements.special) missing.push("un caractère spécial");

    return {
      isValid: Object.values(requirements).every(Boolean),
      requirements,
      message:
        missing.length > 0
          ? `Il manque : ${missing.join(", ")}.`
          : "Mot de passe valide.",
    };
  }, []);

  const getPasswordStrength = useCallback((password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  }, []);

  const passwordValidation = validatePassword(form.password);
  const passwordStrength = getPasswordStrength(form.password);
  const strengthLabels = ["Faible", "Passable", "Bon", "Fort"];

  const clearMessage = () => {
    setMessage("");
    setMessageType("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (message) clearMessage();
  };

  const handleToggleTerms = (e) => {
    setTermsAccepted(e.target.checked);
    if (message) clearMessage();
  };

  // Step 1 submit: validate terms & password
  const handleFirstFormSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted) {
      setMessage(
        "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."
      );
      setMessageType("error");
      return;
    }
    if (!passwordValidation.isValid) {
      setMessage(`Mot de passe invalide. ${passwordValidation.message}`);
      setMessageType("error");
      return;
    }
    handleFinalSubmit();
  };

  // Final submission using apiClient
  const handleFinalSubmit = async () => {
    clearMessage();
    setIsLoading(true);

    try {
      const submitData = { ...form };
      await apiClient.post("/auth/register", submitData);

      setMessage(
        "Compte créé avec succès ! Vous pouvez maintenant vous connecter."
      );
      setMessageType("success");
      setForm({ name: "", email: "", password: "", cnie: "", role: "agent" });
      setTermsAccepted(false);
    } catch (err) {
      // If server responded with error
      const errorMsg =
        err.response?.data?.error || "Échec de l'inscription. Veuillez réessayer.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserForm
      form={form}
      onChange={handleChange}
      onSubmit={handleFirstFormSubmit}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      passwordValidation={passwordValidation}
      passwordStrength={passwordStrength}
      strengthLabels={strengthLabels}
      termsAccepted={termsAccepted}
      onToggleTerms={handleToggleTerms}
      isLoading={isLoading}
      message={message}
      messageType={messageType}
      clearMessage={clearMessage}
    />
  );
}
