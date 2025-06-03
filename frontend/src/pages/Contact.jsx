import React from 'react';

const Contact = () => (
  <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
    <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
      Contactez-nous
    </h2>
    <p className="text-lg text-slate-600 mt-4">
      Nous sommes là pour vous accompagner dans vos besoins en infrastructures électriques. Contactez-nous via les canaux suivants:
    </p>
    <div className="mt-8">
      <h3 className="text-2xl font-semibold text-slate-800">Siège</h3>
      <p className="text-lg text-slate-600 mt-2">
        <a
          href="https://maps.app.goo.gl/RyexyVmCLFg3448f6"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          19 Zone Industrielle Sapino, Nouasseur, Casablanca, Morocco
        </a>
      </p>
      <p className="text-lg text-slate-600 mt-2">
        📞 +212 522 014 045 / 46 / 47
      </p>
      <p className="text-lg text-slate-600 mt-2">
        📧 accueil@lt.ma
      </p>
    </div>
  </div>
);

export default Contact;