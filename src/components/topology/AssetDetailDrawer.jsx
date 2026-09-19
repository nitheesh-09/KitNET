import React from 'react';
import { Cpu, HardDrive } from 'lucide-react';
import Drawer from '../common/Drawer';
import StatusBadge from '../common/StatusBadge';
import SeverityBadge from '../common/SeverityBadge';
import RiskIndicator from '../common/RiskIndicator';

export const AssetDetailDrawer = ({ asset, isOpen, onClose }) => {
  if (!asset) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={asset.name}
      subtitle={`IP: ${asset.ip} • Hostname: ${asset.hostname || 'unknown'}`}
    >
      <div className="space-y-5 text-slate-800">
        {/* Status & Risk Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium text-xs">Operational Status</span>
            <StatusBadge status={asset.status} />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-600 font-medium text-xs">Assessed Risk Score</span>
            <RiskIndicator score={asset.riskScore ?? asset.risk} showBar={true} />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-600 font-medium text-xs">Risk Posture</span>
            <SeverityBadge
              severity={
                asset.riskLevel ||
                (asset.risk > 80 ? 'CRITICAL' : asset.risk > 50 ? 'HIGH' : 'LOW')
              }
            />
          </div>
        </div>

        {/* Specifications */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Host Specifications
          </h3>
          <div className="bg-slate-50 border border-slate-200 rounded divide-y divide-slate-200 font-mono text-xs">
            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Primary Service</span>
              <span className="text-slate-900 font-semibold">{asset.service}</span>
            </div>
            {asset.version && (
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Version</span>
                <span className="text-slate-700">{asset.version}</span>
              </div>
            )}
            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Operating System</span>
              <span className="text-slate-700">{asset.os || 'Linux Kernel 5.15'}</span>
            </div>
            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Network Interface</span>
              <span className="text-slate-700">eth0 (10.0.0.0/24)</span>
            </div>
            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Open Ports</span>
              <span className="text-slate-700">
                {asset.port
                  ? `${asset.port}${
                      asset.additionalPorts?.length
                        ? `, ${asset.additionalPorts.join(', ')}`
                        : ''
                    }`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry & Health */}
        {asset.cpuUsage && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Resource Telemetry
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-slate-500 text-[10px]">CPU USAGE</div>
                  <div className="font-semibold text-slate-900">{asset.cpuUsage}</div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-slate-500 text-[10px]">MEMORY</div>
                  <div className="font-semibold text-slate-900">{asset.memoryUsage}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description & SOC Analyst Context */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            SOC Intelligence Notes
          </h3>
          <p className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-700 leading-relaxed font-sans text-xs">
            {asset.description ||
              (asset.category === 'Rogue Host'
                ? 'Unidentified rogue host transmitting unauthorized auth requests. Subject to autonomous simulation isolation PB-AUTO-CONTAINMENT-01.'
                : 'Standard network endpoint monitored under enterprise SIEM policies.')}
          </p>
        </div>

        {/* Active Listeners */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Active Listeners
          </h3>
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-mono text-slate-700 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] border-b border-slate-200 pb-1">
              <span>PORT</span>
              <span>PROTO</span>
              <span>STATE</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-700 font-semibold">{asset.port || 80}</span>
              <span>TCP</span>
              <span className="text-emerald-700 font-semibold">LISTEN</span>
            </div>
            {asset.additionalPorts?.map((p) => (
              <div key={p} className="flex items-center justify-between text-[11px]">
                <span className="text-blue-700 font-semibold">{p}</span>
                <span>TCP</span>
                <span className="text-emerald-700 font-semibold">LISTEN</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default AssetDetailDrawer;
