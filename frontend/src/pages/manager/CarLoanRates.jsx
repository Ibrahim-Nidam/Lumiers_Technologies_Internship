export default function CarLoanRates() {
  const carLoanRates = [
    {
      id: 1,
      user: "Ibrahim Nidam",
      label: "Ville Casablanca",
      rate: "0.500",
      status: "En attente",
      createdAt: "01/06/2025",
      avatar: "IN",
      location: "Casablanca",
    },
    {
      id: 2,
      user: "Salma Bakkali",
      label: "Société XYZ",
      rate: "0.650",
      status: "Approuvé",
      createdAt: "02/06/2025",
      avatar: "SB",
      location: "Rabat",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#585e5c]">Taux kilométriques</h1>
          <p className="text-gray-600 mt-1">Gérez les remboursements véhicules</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">1 en attente</div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">1 approuvé</div>
        </div>
      </div>

      <div className="space-y-4">
        {carLoanRates.map((rate) => (
          <div
            key={rate.id}
            className="bg-white rounded shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-[#a52148] to-[#8a1c3c] rounded-full flex items-center justify-center text-white font-semibold">
                  {rate.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rate.user}</h3>
                  <p className="text-sm text-gray-500">📍 {rate.location}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-8">
                <div className="bg-gray-50 px-4 py-2 rounded">
                  <div className="text-sm text-gray-600">{rate.label}</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-[#a52148]">{rate.rate}</div>
                  <div className="text-xs text-gray-500">par km</div>
                </div>

                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    rate.status === "Approuvé" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      rate.status === "Approuvé" ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  ></div>
                  {rate.status}
                </div>

                <div className="text-sm text-gray-500">{rate.createdAt}</div>

                <div className="flex gap-2">
                  {rate.status === "En attente" ? (
                    <>
                      <button className="bg-[#a52148] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#8a1c3c] transition-colors">
                        Approuver
                      </button>
                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors">
                        Rejeter
                      </button>
                    </>
                  ) : (
                    <button className="bg-[#a52148] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#8a1c3c] transition-colors">
                      Révoquer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
