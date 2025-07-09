import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, Calendar, User, MapPin, Car, Eye, EyeOff, Route } from 'lucide-react';
import apiClient from '../../utils/axiosConfig';
import { colors } from "../../colors";

const DistanceManager = () => {
  const [distanceDetails, setDistanceDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchDistanceDetails();
  }, []);

  const fetchDistanceDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/distance-details/all');
      setDistanceDetails(response.data);
    } catch (err) {
      setError('Failed to load distance details');
      console.error('Error fetching distance details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this distance detail?')) {
      return;
    }

    try {
      setDeleting(id);
      await apiClient.delete(`/distance-details/admin/${id}`);
      setDistanceDetails(prev => prev.filter(detail => detail.id !== id));
    } catch (err) {
      alert('Failed to delete distance detail');
      console.error('Error deleting:', err);
    } finally {
      setDeleting(null);
    }
  };

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  const toggleUser = (userKey) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userKey]: !prev[userKey]
    }));
  };

  const toggleDay = (dayKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayKey]: !prev[dayKey]
    }));
  };

  const groupDataByMonthUserAndDay = (data) => {
    const grouped = {};
    
    data.forEach(detail => {
      const date = new Date(detail.dateSegment);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const userKey = `${monthKey}-${detail.userId}`;
      const dayKey = `${userKey}-${detail.dateSegment}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthName: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          users: {},
          totalEntries: 0
        };
      }
      
      if (!grouped[monthKey].users[userKey]) {
        grouped[monthKey].users[userKey] = {
          userId: detail.userId,
          userName: detail.user?.nomComplete || `User ${detail.userId}`,
          days: {},
          totalDistance: 0,
          uniqueDays: new Set()
        };
      }
      
      if (!grouped[monthKey].users[userKey].days[dayKey]) {
        grouped[monthKey].users[userKey].days[dayKey] = {
          date: detail.dateSegment,
          segments: [],
          totalDistance: 0
        };
        grouped[monthKey].users[userKey].uniqueDays.add(detail.dateSegment);
      }
      
      grouped[monthKey].users[userKey].days[dayKey].segments.push(detail);
      grouped[monthKey].users[userKey].days[dayKey].totalDistance += parseFloat(detail.distanceKm);
      grouped[monthKey].users[userKey].totalDistance += parseFloat(detail.distanceKm);
    });
    
    Object.keys(grouped).forEach(monthKey => {
      let monthEntries = 0;
      Object.keys(grouped[monthKey].users).forEach(userKey => {
        monthEntries += grouped[monthKey].users[userKey].uniqueDays.size;
      });
      grouped[monthKey].totalEntries = monthEntries;
    });
    
    return grouped;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: colors.primary}}></div>
          <p className="text-gray-600">Loading distance details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 text-lg font-semibold">{error}</p>
          <button 
            onClick={fetchDistanceDetails}
            className="mt-4 px-4 py-2 rounded-lg text-white transition-colors"
            style={{backgroundColor: colors.primary}}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const groupedData = groupDataByMonthUserAndDay(distanceDetails);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold" style={{color: colors.logo_text}}>
              Distance Details Manager
            </h1>
            <p className="mt-2 text-gray-600">
              Manage and view all distance details organized by month, user, and day
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {Object.keys(groupedData).length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No distance details found</h3>
            <p className="text-gray-600">There are no distance details to display at this time.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedData)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([monthKey, monthData]) => (
                <div key={monthKey} className="bg-white rounded-lg shadow-sm border">
                  {/* Month Header */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleMonth(monthKey)}
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-6 h-6" style={{color: colors.primary}} />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {monthData.monthName}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {monthData.totalEntries} entries • {Object.keys(monthData.users).length} users
                        </p>
                      </div>
                    </div>
                    {expandedMonths[monthKey] ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Month Content */}
                  {expandedMonths[monthKey] && (
                    <div className="border-t">
                      {Object.entries(monthData.users).map(([userKey, userData]) => (
                        <div key={userKey} className="border-b last:border-b-0">
                          {/* User Header */}
                          <div 
                            className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleUser(userKey)}
                          >
                            <div className="flex items-center space-x-3">
                              <User className="w-5 h-5" style={{color: colors.secondary}} />
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {userData.userName}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {userData.uniqueDays.size} days • {userData.totalDistance.toFixed(2)} km total
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {expandedUsers[userKey] ? (
                                <EyeOff className="w-4 h-4 text-gray-400" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-400" />
                              )}
                              {expandedUsers[userKey] ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* User Days */}
                          {expandedUsers[userKey] && (
                            <div className="divide-y">
                              {Object.entries(userData.days)
                                .sort(([, a], [, b]) => new Date(b.date) - new Date(a.date))
                                .map(([dayKey, dayData]) => (
                                  <div key={dayKey} className="bg-white">
                                    {/* Day Header */}
                                    <div 
                                      className="flex items-center justify-between p-4 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors border-l-4"
                                      style={{borderLeftColor: colors.primary}}
                                      onClick={() => toggleDay(dayKey)}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <Route className="w-5 h-5" style={{color: colors.primary}} />
                                        <div>
                                          <h4 className="font-medium text-gray-900">
                                            {formatDate(dayData.date)}
                                          </h4>
                                          <p className="text-sm text-gray-600">
                                            {dayData.segments.length} segments • {dayData.totalDistance.toFixed(2)} km
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                          {dayData.segments.length}
                                        </span>
                                        {expandedDays[dayKey] ? (
                                          <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                      </div>
                                    </div>

                                    {/* Day Segments */}
                                    {expandedDays[dayKey] && (
                                      <div className="divide-y bg-gray-50">
                                        {dayData.segments.map((segment, index) => (
                                          <div key={segment.id} className="p-4 bg-white ml-4 mr-4 mb-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                                              <div className="flex-1 space-y-2">
                                                <div className="flex items-center space-x-2 text-sm">
                                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Segment {index + 1}
                                                  </span>
                                                  <span className="text-gray-500">
                                                    {formatDateShort(segment.dateSegment)}
                                                  </span>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                  <MapPin className="w-4 h-4 text-gray-400" />
                                                  <span className="text-sm text-gray-900">
                                                    <span className="font-medium">{segment.lieuDepart}</span>
                                                    <span className="text-gray-500 mx-2">→</span>
                                                    <span className="font-medium">{segment.lieuArrivee}</span>
                                                  </span>
                                                </div>
                                                
                                                <div className="flex items-center space-x-4 text-sm">
                                                  <div className="flex items-center space-x-1">
                                                    <Car className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-600 font-medium">
                                                      {segment.distanceKm} km
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center space-x-2">
                                                <button
                                                  onClick={() => handleDelete(segment.id)}
                                                  disabled={deleting === segment.id}
                                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                  title="Delete segment"
                                                >
                                                  {deleting === segment.id ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                                                  ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DistanceManager;