"use client";

import { useState, useCallback } from "react";
import UserForm from "./UserForm";
import CarLoanForm from "./CarLoanForm";

// -------------------------------------
// Parent "Register" page
// -------------------------------------
export default function Register() {
  // ------------- shared state -------------
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  // const [carLoanChecked, setCarLoanChecked] = useState(false);
  // const [showCarLoanForm, setShowCarLoanForm] = useState(false);
  // const [carLoanEntries, setCarLoanEntries] = useState([
  //   { destination: "", taux: "" },
  // ]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // const roles = [
  //   { value: "agent", label: "Agent", description: "Niveau d'accès de base" },
  //   {
  //     value: "manager",
  //     label: "Gestionnaire",
  //     description: "Accès à la gestion d'équipe",
  //   },
  //   {
  //     value: "admin",
  //     label: "Administrateur",
  //     description: "Accès complet au système",
  //   },
  // ];

  // ------------- password utils -------------
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
      isValid: Object.values(requirements).every((req) => req),
      requirements,
      message:
        missing.length > 0
          ? `Il manque : ${missing.join(", ")}.`
          : "Mot de passe valide.",
    };
  }, []);

  const getPasswordStrength = useCallback((password) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  }, []);

  // ------------- Car Loan Validation -------------
  // const validateCarLoanEntries = useCallback((entries) => {
  //   const errors = [];
  //   const destinations = [];
    
  //   // Filter out empty entries
  //   const validEntries = entries.filter(entry => 
  //     entry.destination.trim() !== '' || entry.taux !== ''
  //   );
    
  //   if (validEntries.length === 0) {
  //     return { isValid: true, errors: [] };
  //   }

  //   validEntries.forEach((entry, index) => {
  //     const destination = entry.destination.trim();
  //     const taux = parseFloat(entry.taux);
      
  //     // Check for empty destination
  //     if (destination === '') {
  //       errors.push(`Entrée ${index + 1}: La destination ne peut pas être vide`);
  //       return;
  //     }
      
  //     // Check for empty or invalid taux
  //     if (entry.taux === '' || isNaN(taux)) {
  //       errors.push(`Entrée ${index + 1}: Le taux ne peut pas être vide`);
  //       return;
  //     }
      
  //     // Check if taux <= 1
  //     if (taux <= 1) {
  //       errors.push(`Entrée ${index + 1}: Le taux doit être supérieur à 1`);
  //     }
      
  //     // Check for duplicates (case insensitive)
  //     const lowerDestination = destination.toLowerCase();
  //     const existingIndex = destinations.findIndex(dest => dest.toLowerCase() === lowerDestination);
      
  //     if (existingIndex !== -1) {
  //       errors.push(`Destination en double détectée: "${destination}" (entrées ${existingIndex + 1} et ${index + 1})`);
  //     } else {
  //       destinations.push(destination);
  //     }
  //   });

  //   return {
  //     isValid: errors.length === 0,
  //     errors: errors
  //   };
  // }, []);

  const passwordStrength = getPasswordStrength(form.password);
  const passwordValidation = validatePassword(form.password);
  const strengthLabels = ["Faible", "Passable", "Bon", "Fort"];

  // ------------- message handlers -------------
  const clearMessage = () => {
    setMessage("");
    setMessageType("");
  };

  // Whenever any field changes, clear any existing message
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (message) clearMessage();
  };

  // Toggle car loan checkbox
  // const handleToggleCarLoan = (e) => {
  //   setCarLoanChecked(e.target.checked);
  //   if (!e.target.checked) {
  //     // if they uncheck, hide second form & reset entries
  //     setShowCarLoanForm(false);
  //     setCarLoanEntries([{ destination: "", taux: "" }]);
  //   }
  // };

  // Toggle terms checkbox
  const handleToggleTerms = (e) => {
    setTermsAccepted(e.target.checked);
    if (message) clearMessage();
  };

  // ------------- Step 1: "UserForm" submit -------------
  const handleFirstFormSubmit = async (e) => {
    e.preventDefault();

    // 1) Must accept terms
    if (!termsAccepted) {
      setMessage(
        "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."
      );
      setMessageType("error");
      return;
    }

    // 2) Validate password
    if (!passwordValidation.isValid) {
      setMessage(`Mot de passe invalide. ${passwordValidation.message}`);
      setMessageType("error");
      return;
    }

    // 3) If carLoanChecked → show second form; else → final submit
    // if (carLoanChecked) {
    //   setShowCarLoanForm(true);
    // } 
    else {
      handleFinalSubmit();
    }
  };

  // ------------- Step 2: CarLoan helpers -------------
  // const handleCarLoanInputChange = (index, field, value) => {
  //   setCarLoanEntries((prev) => {
  //     const arr = [...prev];
  //     arr[index][field] = value;
  //     return arr;
  //   });
  //   // Clear message when user makes changes
  //   if (message) clearMessage();
  // };

  // const addCarLoanEntry = () => {
  //   setCarLoanEntries((prev) => [...prev, { destination: "", taux: "" }]);
  // };

  // ------------- Final submission (common) + CarLoan validation -------------
  const handleFinalSubmit = async () => {
    // If we have car loan entries, validate them first
    // if (carLoanChecked && carLoanEntries.length > 0) {
    //   const validation = validateCarLoanEntries(carLoanEntries);
    //   if (!validation.isValid) {
    //     setMessage(validation.errors.join('. '));
    //     setMessageType("error");
    //     return; // Don't proceed with submission
    //   }
    // }

    clearMessage();
    setIsLoading(true);

    try {
      const submitData = {
        ...form,
        // carLoan: carLoanChecked ? carLoanEntries : null,
      };

      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(
          "Compte créé avec succès ! Vous pouvez maintenant vous connecter."
        );
        setMessageType("success");

        // Reset everything
        setForm({ name: "", email: "", password: "", role: "agent" });
        // setCarLoanEntries([{ destination: "", taux: "" }]);
        // setCarLoanChecked(false);
        // setShowCarLoanForm(false);
        setTermsAccepted(false);
      } else {
        setMessage(data.error || "Échec de l'inscription. Veuillez réessayer.");
        setMessageType("error");
      }
    } catch {
      setMessage("Erreur réseau. Veuillez vérifier votre connexion.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // Render either UserForm (step 1) or CarLoanForm (step 2)
  // -------------------------------------------------------------------
  return  (
    <UserForm
      form={form}
      onChange={handleChange}
      onSubmit={handleFirstFormSubmit}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      passwordValidation={passwordValidation}
      passwordStrength={passwordStrength}
      strengthLabels={strengthLabels}
      // roles={roles}
      // carLoanChecked={carLoanChecked}
      // onToggleCarLoan={handleToggleCarLoan}
      termsAccepted={termsAccepted}
      onToggleTerms={handleToggleTerms}
      isLoading={isLoading}
      message={message}
      messageType={messageType}
      clearMessage={clearMessage}
    />
  );
}