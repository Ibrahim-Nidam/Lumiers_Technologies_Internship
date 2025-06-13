import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import logo from './base64Logo';

export const getMonthLabel = (year, month) => {
  return new Date(year, month).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
};

export const handleExcelExport = (year, month) => {
  const label = getMonthLabel(year, month);
  alert(`Export Excel pour ${label} - Fonctionnalité à implémenter`);
};

export const handlePDFExport = async (year, month, dashboardData) => {
  const label = getMonthLabel(year, month);

  // Initialize pdfmake correctly
  pdfMake.vfs = pdfFonts.vfs;
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };

  // Calculate totals from dashboard data
  const calculateTotals = () => {
    const { trips, userMissionRates, userCarLoans, travelTypes } = dashboardData;

    // Use Maps to dynamically group expenses
    const dailyAllowances = new Map();
    const mileageCosts = new Map(); // Key will be the car loan's libelle
    let totalMiscExpenses = 0;
    let miscExpensesCount = 0; // Counter for the number of expenses

    trips.forEach(trip => {
      // 1. Sum miscellaneous expenses and count them
      if (trip.depenses && Array.isArray(trip.depenses)) {
        miscExpensesCount += trip.depenses.length;
        trip.depenses.forEach(expense => {
          totalMiscExpenses += parseFloat(expense.montant) || 0;
        });
      }

      // 2. Group Mileage Costs by car loan libelle
      const distance = parseFloat(trip.distanceKm) || 0;
      if (trip.carLoanId && distance > 0) {
        const carLoan = userCarLoans.find(loan => loan.id === trip.carLoanId);
        if (carLoan) {
          const rate = parseFloat(carLoan.tarifParKm) || 0;
          const cost = distance * rate;
          // Use the 'libelle' as the key to group different vehicle types
          const libelle = carLoan.libelle || '(Véhicule non spécifié)';

          if (!mileageCosts.has(libelle)) {
            mileageCosts.set(libelle, { distance: 0, total: 0, rate: rate });
          }
          const current = mileageCosts.get(libelle);
          current.distance += distance;
          current.total += cost;
        }
      }

      // 3. Group Daily Allowances by their rate
      const missionRate = userMissionRates.find(rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId);
      if (missionRate) {
        const rate = parseFloat(missionRate.tarifParJour) || 0;
        const travelTypeName = travelTypes.find(type => type.id === trip.typeDeDeplacementId)?.nom || 'Type de déplacement inconnu';
        
        if (!dailyAllowances.has(rate)) {
            dailyAllowances.set(rate, { count: 0, total: 0, name: travelTypeName });
        }
        const current = dailyAllowances.get(rate);
        current.count += 1;
        current.total += rate;
      }
    });

    // Calculate Grand Total
    let grandTotal = totalMiscExpenses;
    mileageCosts.forEach(value => grandTotal += value.total);
    dailyAllowances.forEach(value => grandTotal += value.total);
    
    return {
      totalMiscExpenses,
      miscExpensesCount,
      mileageCosts,
      dailyAllowances,
      grandTotal
    };
  };

  const totals = calculateTotals();
  const userInfo = dashboardData.userInfo || {};

  // Dynamically build the table body
  const tableBody = [
      [
          { text: 'Désignation', bold: true, fillColor: '#f0f0f0' },
          { text: 'Chantier', bold: true, fillColor: '#f0f0f0' },
          { text: 'Quantité', bold: true, fillColor: '#f0f0f0' },
          { text: 'Taux / J', bold: true, fillColor: '#f0f0f0' },
          { text: 'Montant', bold: true, fillColor: '#f0f0f0' }
      ],
      [
          'Feuille de depens', 
          '', 
          { text: totals.miscExpensesCount, alignment: 'right' }, // Display number of expenses
          '-', 
          { text: totals.totalMiscExpenses.toFixed(2), alignment: 'right' }
      ]
  ];

  // Add a row for each unique daily allowance rate
  totals.dailyAllowances.forEach((data, rate) => {
      tableBody.push([
          `Frais journaliers (${data.name})`, // Prepend text as requested
          '',
          { text: `${data.count}`, alignment: 'right' },
          { text: rate.toFixed(2), alignment: 'right' },
          { text: data.total.toFixed(2), alignment: 'right' }
      ]);
  });

  // Add a row for each unique mileage category (based on carLoan.libelle)
  totals.mileageCosts.forEach((data, libelle) => {
      tableBody.push([
          `Frais kilométrique (${libelle})`, // Dynamically add libelle
          '',
          { text: `${data.distance.toFixed(2)} Km`, alignment: 'right' },
          { text: data.rate.toFixed(2), alignment: 'right' },
          { text: data.total.toFixed(2), alignment: 'right' }
      ]);
  });

  // Add the final total row
  tableBody.push([
      { text: 'Total Dépense', colSpan: 4, alignment: 'right', bold: true, fillColor: '#f0f0f0' },
      {}, {}, {},
      { text: totals.grandTotal.toFixed(2), bold: true, alignment: 'right', fillColor: '#f0f0f0' }
  ]);


  const docDefinition = {
    content: [
      {
        columns: [
          { image: logo, width: 100, height: 50 },
          { text: `Nom et Prénom : ${userInfo.fullName || ''}`, style: 'userInfo', alignment: 'right' }
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: `Note de frais - ${label}`,
        style: 'header'
      },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody
        },
        layout: {
          hLineWidth: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? 2 : 1;
          },
          vLineWidth: function (i, node) {
            return (i === 0 || i === node.table.widths.length) ? 2 : 1;
          },
          hLineColor: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? 'black' : 'gray';
          },
          vLineColor: function (i, node) {
            return (i === 0 || i === node.table.widths.length) ? 'black' : 'gray';
          }
        }
      },
      {
        text: '\n\n\n'
      },
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              { text: 'Signature de l\'intéressé', alignment: 'center', border: [true, true, true, false] },
              { text: 'Signature du responsable', alignment: 'center', border: [true, true, true, false] }
            ],
            [
              { text: '', margin: [0, 40, 0, 0], border: [true, false, true, true] },
              { text: '', margin: [0, 40, 0, 0], border: [true, false, true, true] }
            ]
          ]
        },
        layout: 'noBorders'
      }
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      userInfo: {
        fontSize: 12,
        alignment: 'right'
      }
    },
    defaultStyle: {
      fontSize: 10
    }
  };

  try {
    pdfMake.createPdf(docDefinition).download(`note_de_frais_${year}_${month + 1}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Une erreur est survenue lors de la génération du PDF');
  }
};