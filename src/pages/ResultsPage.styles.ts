/**
 * Styles for ResultsPage
 */

export const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: '100vh',
    backgroundColor: 'transparent',
  },
  pageHeader: {
    backgroundColor: 'transparent',
    borderBottom: 'none',
    padding: '16px 0',
  },
  pageHeaderContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
  },
  contentWrapper: {
    display: 'flex',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #eaeaea',
  },
  mainContentContainer: {
    flex: 1,
    minWidth: 0,
    paddingLeft: '24px',
  },
  mainContent: {
    backgroundColor: 'transparent',
    borderRadius: '0',
    padding: '0',
    border: 'none',
  },
  mainTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#000',
    margin: '0 0 20px 0',
    letterSpacing: '-0.01em',
  },
  loadingContainer: {
    padding: '48px',
    textAlign: 'center',
    color: '#666',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    margin: '0 0 16px',
    fontSize: '14px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#666',
    backgroundColor: 'transparent',
    border: '1px solid #eaeaea',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  container: {
    padding: '24px',
  },
};
