'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { Download, Filter, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';

interface CampaignRow {
  campaign: string;
  source: string;
  medium: string;
  orders: number;
  revenue: number;
  conversion_rate: number;
}

interface CampaignReportResponse {
  report: {
    total_orders: number;
    total_revenue: number;
    overall_conversion_rate: number;
    by_campaign: CampaignRow[];
    by_source: { source: string; orders: number; revenue: number }[];
    by_medium: { medium: string; orders: number; revenue: number }[];
  };
  filters: {
    sources: string[];
    mediums: string[];
    campaigns: string[];
  };
}

interface FilterOptions {
  sources: string[];
  mediums: string[];
  campaigns: string[];
}

const buttonStyle = (disabled: boolean, variant: 'primary' | 'outline' = 'primary') => ({
  padding: '10px 16px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  border: variant === 'outline' ? '1px solid #E8EDEE' : 'none',
  background: variant === 'outline' ? '#FDFDFC' : '#5FD9B3',
  color: variant === 'outline' ? '#1E332E' : '#1E332E',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
});

const inputStyle = (width = '100%') => ({
  width,
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #E8EDEE',
  background: '#FDFDFC',
  fontSize: '14px',
  outline: 'none',
});

const labelStyle = () => ({
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1E332E',
  marginBottom: '6px',
});

const cardStyle = () => ({
  background: '#FFFFFF',
  border: '1px solid #E8EDEE',
  borderRadius: '12px',
  padding: '20px',
});

export function CampaignReport() {
  const t = useTranslations('AdminAnalytics');
  const [report, setReport] = useState<CampaignReportResponse['report'] | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({ sources: [], mediums: [], campaigns: [] });
  const [selectedFilters, setSelectedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    source: '',
    medium: '',
    campaign: '',
  });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CampaignRow; direction: 'asc' | 'desc' } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<'from' | 'to' | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/campaigns/filters/options');
      if (res.ok) {
        const data = await res.json();
        setFilters(data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch filter options:', error);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFilters.dateFrom) params.set('dateFrom', selectedFilters.dateFrom);
      if (selectedFilters.dateTo) params.set('dateTo', selectedFilters.dateTo);
      if (selectedFilters.source) params.set('utm_source', selectedFilters.source);
      if (selectedFilters.medium) params.set('utm_medium', selectedFilters.medium);
      if (selectedFilters.campaign) params.set('utm_campaign', selectedFilters.campaign);

      const res = await fetch(`/api/admin/analytics/campaigns?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      } else {
        setToast({ type: 'error', message: t('failed_to_load_report') || 'Failed to load report' });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch report:', error);
      setToast({ type: 'error', message: t('failed_to_load_report') || 'Failed to load report' });
    } finally {
      setLoading(false);
    }
  }, [selectedFilters, t]);

  useEffect(() => {
    fetchFilters();
    fetchReport();
  }, [fetchFilters, fetchReport]);

  const handleSort = (key: keyof CampaignRow) => {
    setSortConfig((current) => {
      if (current?.key === key && current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedData = report?.by_campaign
    ? [...report.by_campaign].sort((a, b) => {
        if (!sortConfig) return 0;
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : [];

  const handleExport = async () => {
    if (!report) return;
    setExportLoading(true);
    try {
      const csvHeaders = [t('campaign') || 'Campaign', t('source') || 'Source', t('medium') || 'Medium', t('orders') || 'Orders', t('revenue') || 'Revenue (SAR)', t('conversion_rate') || 'Conversion Rate'];
      const csvRows = sortedData.map((row) => [
        row.campaign,
        row.source,
        row.medium,
        row.orders.toString(),
        row.revenue.toFixed(2),
        `${row.conversion_rate.toFixed(2)}%`,
      ]);
      const csvContent = [csvHeaders, ...csvRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `campaign-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      setToast({ type: 'success', message: t('export_success') || 'Report exported successfully' });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', error);
      setToast({ type: 'error', message: t('export_failed') || 'Export failed' });
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ar-SA').format(value);
  };

  const SortIcon = ({ key }: { key: keyof CampaignRow }) => {
    if (sortConfig?.key !== key) return <ChevronDown style={{ width: 16, height: 16, color: '#999' }} />;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp style={{ width: 16, height: 16, color: '#5FD9B3' }} />
    ) : (
      <ChevronDown style={{ width: 16, height: 16, color: '#5FD9B3' }} />
    );
  };

  const DatePicker = ({ 
    value, 
    onChange, 
    placeholder 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string;
  }) => {
    const [inputValue, setInputValue] = useState(value);
    
    return (
      <div style={{ position: 'relative' }}>
        <input
          type="date"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            onChange(newValue);
          }}
          style={inputStyle()}
          placeholder={placeholder}
        />
      </div>
    );
  };

  const Select = ({ 
    value, 
    onChange, 
    options, 
    placeholder 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    options: { value: string; label: string }[];
    placeholder: string;
  }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle()}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );

  return (
    <div style={{ padding: '16px 16px 16px 16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Export */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1E332E', margin: 0 }}>
            {t('campaign_attribution') || 'Campaign Attribution'}
          </h1>
          <p style={{ color: '#666', margin: '8px 0 0 0' }}>
            {t('campaign_attribution_desc') || 'Track orders and revenue by UTM campaign, source, and medium'}
          </p>
        </div>
        <button 
          onClick={handleExport} 
          disabled={exportLoading || !report}
          style={buttonStyle(exportLoading || !report)}
        >
          {exportLoading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: 16, height: 16 }} />}
          {t('export_csv') || 'Export CSV'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          padding: '12px 16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '8px', color: '#fff',
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle style={{ width: 20, height: 20 }} /> : <AlertCircle style={{ width: 20, height: 20 }} />}
          <span>{toast.message}</span>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      {/* Filters */}
      <div style={cardStyle()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter style={{ width: 20, height: 20 }} />
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{t('filters') || 'Filters'}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            {labelStyle() && <label>{t('date_from') || 'Date From'}</label>}
            <DatePicker 
              value={selectedFilters.dateFrom} 
              onChange={(v) => setSelectedFilters((prev) => ({ ...prev, dateFrom: v }))}
              placeholder={t('select_date') || 'Select date'}
            />
          </div>

          <div>
            {labelStyle() && <label>{t('date_to') || 'Date To'}</label>}
            <DatePicker 
              value={selectedFilters.dateTo} 
              onChange={(v) => setSelectedFilters((prev) => ({ ...prev, dateTo: v }))}
              placeholder={t('select_date') || 'Select date'}
            />
          </div>

          <div>
            {labelStyle() && <label>{t('source') || 'Source'}</label>}
            <Select 
              value={selectedFilters.source} 
              onChange={(v) => setSelectedFilters((prev) => ({ ...prev, source: v }))}
              options={[{ value: '', label: t('all_sources') || 'All Sources' }, ...filters.sources.map(s => ({ value: s, label: s }))]}
              placeholder={t('all_sources') || 'All Sources'}
            />
          </div>

          <div>
            {labelStyle() && <label>{t('medium') || 'Medium'}</label>}
            <Select 
              value={selectedFilters.medium} 
              onChange={(v) => setSelectedFilters((prev) => ({ ...prev, medium: v }))}
              options={[{ value: '', label: t('all_mediums') || 'All Mediums' }, ...filters.mediums.map(m => ({ value: m, label: m }))]}
              placeholder={t('all_mediums') || 'All Mediums'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={fetchReport} 
              disabled={loading}
              style={buttonStyle(loading)}
            >
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : null}
              {t('apply') || 'Apply'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div style={cardStyle()}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px 0' }}>{t('total_orders') || 'Total Orders'}</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#1E332E', margin: 0 }}>{formatNumber(report.total_orders)}</p>
          </div>
          <div style={cardStyle()}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px 0' }}>{t('total_revenue') || 'Total Revenue'}</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#1E332E', margin: 0 }}>{formatCurrency(report.total_revenue)}</p>
          </div>
          <div style={cardStyle()}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px 0' }}>{t('conversion_rate') || 'Conversion Rate'}</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#1E332E', margin: 0 }}>{report.overall_conversion_rate.toFixed(2)}%</p>
          </div>
        </div>
      )}

      {/* Campaign Table */}
      <div style={cardStyle()}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>{t('campaigns') || 'Campaigns'}</h3>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Loader2 style={{ width: 32, height: 32, color: '#5FD9B3', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !report || report.by_campaign.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
            {t('no_data') || 'No campaign data found for the selected filters'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E8EDEE' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, cursor: 'pointer', color: '#1E332E' }} onClick={() => handleSort('campaign')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {t('campaign') || 'Campaign'} <SortIcon key="campaign" />
                    </div>
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, cursor: 'pointer', color: '#1E332E' }} onClick={() => handleSort('source')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {t('source') || 'Source'} <SortIcon key="source" />
                    </div>
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, cursor: 'pointer', color: '#1E332E' }} onClick={() => handleSort('medium')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {t('medium') || 'Medium'} <SortIcon key="medium" />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600, cursor: 'pointer', color: '#1E332E' }} onClick={() => handleSort('orders')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      {t('orders') || 'Orders'} <SortIcon key="orders" />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600, cursor: 'pointer', color: '#1E332E' }} onClick={() => handleSort('revenue')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      {t('revenue') || 'Revenue'} <SortIcon key="revenue" />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600, cursor: 'pointer', color: '#1E332E' }} onClick={() => handleSort('conversion_rate')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      {t('conversion_rate') || 'Conv. Rate'} <SortIcon key="conversion_rate" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr key={`${row.campaign}|${row.source}|${row.medium}`} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{row.campaign}</td>
                    <td style={{ padding: '12px 8px' }}>{row.source}</td>
                    <td style={{ padding: '12px 8px' }}>{row.medium}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(row.orders)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(row.revenue)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{row.conversion_rate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Source Breakdown */}
      {report && report.by_source.length > 0 && (
        <div style={{ ...cardStyle(), marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>{t('by_source') || 'By Source'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {report.by_source.map((item) => (
              <div key={item.source} style={{ padding: '16px', background: '#F8F9FA', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E332E', margin: '0 0 8px 0' }}>{item.source}</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#1E332E', margin: '0 0 4px 0' }}>{formatNumber(item.orders)}</p>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{formatCurrency(item.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medium Breakdown */}
      {report && report.by_medium.length > 0 && (
        <div style={{ ...cardStyle(), marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>{t('by_medium') || 'By Medium'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {report.by_medium.map((item) => (
              <div key={item.medium} style={{ padding: '16px', background: '#F8F9FA', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E332E', margin: '0 0 8px 0' }}>{item.medium}</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#1E332E', margin: '0 0 4px 0' }}>{formatNumber(item.orders)}</p>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{formatCurrency(item.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignReport;