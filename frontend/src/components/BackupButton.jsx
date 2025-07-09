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
      
      let filename = 'database-backup.sql';
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
    <button
      onClick={handleBackup}
      className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded transition-all duration-200 text-[#585e5c] hover:bg-gray-50 hover:text-[#a52148] border border-gray-200 hover:border-[#a52148]"
    >
      <span className="text-base">📦</span>
      <span className="hidden sm:inline">Sauvegarde</span>
    </button>
  );
};

export default BackupButton;