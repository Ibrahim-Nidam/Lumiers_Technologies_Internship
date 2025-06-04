import React from 'react';

const FeatureCard = ({ title, description, icon }) => (
  <div className="bg-white p-6 rounded shadow-lg hover:shadow-xl transition-shadow">
    <div className="text-4xl text-primary mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
    <p className="text-lg text-slate-600 mt-2">{description}</p>
  </div>
);

export default FeatureCard;
