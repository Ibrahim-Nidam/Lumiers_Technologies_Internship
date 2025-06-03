import React from 'react';
import { colors } from '../colors';

const Footer = () => (
  <footer className=" text-white py-6 border-t border-slate-200 ">
    <div className="max-w-5xl mx-auto px-4 text-center" style={{ color: colors.logo_text}}>
      <p>&copy;2025 - Lumieres Et Technologie Sarl. Tous droits réservés.</p>
      <p>
        <a href="mailto:accueil@lt.ma" className="text-gray-400 hover:text-[#a52148]">accueil@lt.ma</a>
      </p>
    </div>
  </footer>
);

export default Footer;
