import axios from '../utils/axiosConfig';

const BackupButton = ({ user }) => {
  const handleBackup = async () => {
  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    const response = await axios.get('/backup', {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Extract filename from Content-Disposition header if present
    let filename = 'database-backup.sql'; // default fallback
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to create backup:', err);
    alert('La sauvegarde a échoué !');
  }
};


  if (!user || user.role !== 'manager') return null;

  return (
    <div className="w-full flex justify-center sm:justify-end md:justify-start px-4 mt-4">
      <button
        onClick={handleBackup}
        className="bg-red-600 text-white font-semibold px-6 py-2 rounded-xl shadow-md hover:bg-red-700 transition duration-200 w-full sm:w-auto text-sm sm:text-base"
      >
        📦 Créer une sauvegarde
      </button>
    </div>
  );
};

export default BackupButton;
