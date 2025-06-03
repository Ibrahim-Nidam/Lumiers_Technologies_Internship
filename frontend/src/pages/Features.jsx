import React from 'react';
import FeatureCard from '../components/FeatureCard';

const Features = () => (
  <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
    <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
      Nos Services Principaux
    </h2>
    <p className="text-lg text-slate-600 mt-4">
      Lumières Et Technologie Sarl offre une gamme complète de services adaptés pour répondre aux besoins spécifiques de nos clients dans divers secteurs.
    </p>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 mt-8">
      <FeatureCard
        title="Infrastructure Aéronautique"
        description="Conception et maintenance des systèmes d'éclairage d'aéroport, systèmes de manutention des bagages, et solutions d'alimentation électrique."
        icon="✈️"
      />
      <FeatureCard
        title="Systèmes Ferroviaires"
        description="Mise en œuvre de systèmes de signalisation ferroviaire, sous-stations, et équipements de sécurité."
        icon="🚆"
      />
      <FeatureCard
        title="Solutions Industrielles"
        description="Développement de réseaux électriques, systèmes d'automatisation, et éclairage industriel."
        icon="🏭"
      />
    </div>
  </div>
);

export default Features;