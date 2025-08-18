import { useMemo } from 'react';
import { FaUserCircle, FaBuilding } from 'react-icons/fa';

const QuestionnaireHeader = ({
  clients = [],           // Only relevant for 'COMPANY' role
  vendors = [],           // All vendors for 'COMPANY', client-specific for 'CLIENT'
  selectedClient,         // ID of selected client (COMPANY only)
  selectedVendor,         // Object of selected vendor for both roles
  onClientChange,         // Callback for client selection (COMPANY only)
  onVendorChange,         // Callback for vendor selection (both roles)
  userRole,               // 'CLIENT' or 'COMPANY'
}) => {
  // Memoized vendor list based on selected client
  const vendorsToDisplay = useMemo(() => {
    if (userRole === 'CLIENT') return vendors;
    return selectedClient ? vendors.filter((v) => v.clientId.toString() === selectedClient.toString()) : [];
  }, [vendors, selectedClient, userRole]);

  const dropdownClasses =
    'flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer';

  const disabledDropdownClasses =
    'flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-100 opacity-60 cursor-not-allowed';

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800">Questionnaire</h2>

      <div className="flex gap-4 items-center">
        {/* Client Dropdown - Only for COMPANY */}
        {userRole !== 'CLIENT' && (
          <div className="relative">
            <div className={dropdownClasses}>
              <FaBuilding className="text-blue-600" />
              <select
                aria-label="Select Client"
                className="bg-transparent outline-none text-sm text-gray-800 rounded-lg"
                value={selectedClient || ''}
                onChange={(e) => onClientChange(e.target.value)}
              >
                <option className=' rounded-xl' value="">
                  Select Client
                </option>
                {clients.map((client) => (
                  <option className='rounded-lg' key={client.id} value={client.id.toString()}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Vendor Dropdown */}
        <div className="relative">
          <div
            className={
              userRole !== 'CLIENT' && !selectedClient ? disabledDropdownClasses : dropdownClasses
            }
          >
            <FaUserCircle className="text-emerald-800" />
            <select
              aria-label="Select Vendor"
              className="bg-transparent outline-none text-sm text-gray-800"
              value={selectedVendor?.id?.toString() || ''}
              onChange={(e) => {
                const vendor = vendorsToDisplay.find((v) => v.id.toString() === e.target.value);
                onVendorChange(vendor || null); // Pass full object or null
              }}
              disabled={(userRole !== 'CLIENT' && !selectedClient) || vendorsToDisplay.length === 0}
            >
              <option className='rounded-xl'  value="" disabled>
                Select Vendor
              </option>
              {vendorsToDisplay.map((vendor) => (
                <option key={vendor.id} value={vendor.id.toString()}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireHeader;
