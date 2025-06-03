import React from 'react';
import { colors } from '../colors';

const About = () => {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          À propos de <span style={{ color: colors.primary }}>Lumières Et Technologie</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Éclairer le chemin vers l'excellence technologique grâce à des solutions innovantes et des outils d'entreprise de pointe.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Notre Mission</h2>
          <p className="text-slate-600 mb-4">
            Chez Lumières Et Technologie, nous croyons que la technologie doit éclairer les possibilités, et non les compliquer. 
            Notre mission est de fournir aux entreprises les outils dont elles ont besoin pour prospérer dans un monde de plus en plus numérique.
          </p>
          <p className="text-slate-600">
            Nous combinons une technologie de pointe avec un design intuitif pour créer des solutions à la fois puissantes et 
            accessibles aux organisations de toutes tailles.
          </p>
        </div>
        <div className="bg-slate-100 rounded-lg p-8 text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Innovation d'abord</h3>
          <p className="text-slate-600">
            Chaque solution que nous créons est conçue en pensant à l'avenir, garantissant évolutivité et adaptabilité.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Équipe d'experts</h3>
          <p className="text-slate-600 text-sm">
            Notre équipe de développeurs et designers expérimentés apporte des décennies d'expertise combinée.
          </p>
        </div>
        
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Focus sécurité</h3>
          <p className="text-slate-600 text-sm">
            La sécurité de niveau entreprise est intégrée dans chaque solution que nous livrons, protégeant vos données précieuses.
          </p>
        </div>
        
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Rapide comme l'éclair</h3>
          <p className="text-slate-600 text-sm">
            Les performances optimisées garantissent que vos applications fonctionnent de manière fluide et efficace à grande échelle.
          </p>
        </div>
      </div>
    </main>
  );
};

export default About;