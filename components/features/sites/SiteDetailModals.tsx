import { AddSensorModal } from '@/components/features/sites/AddSensorModal'
import { RemoveSensorModal } from '@/components/features/sites/RemoveSensorModal'
import { IconDeleteModal } from '@/components/features/sensors/IconDeleteModal'
import { IconEditModal } from '@/components/features/sensors/IconEditModal'
import { IconAddModal } from '@/components/features/sensors/IconAddModal'
import { QRModal } from '@/components/ui/QRModal'

export function SiteDetailModals({
  site,
  allSensors,
  siteSensors,
  icons,
  addIconSensor,
  addIconDepth,
  editingIcon,
  editingLabel,
  qrSensor,
  showAddSensor,
  showRemoveSensor,
  showDeleteIconModal,
  showAddIcon,
  onAddSensorClose,
  onAddSensorSave,
  onRemoveSensorClose,
  onRemoveSensor,
  onDeleteIconClose,
  onDeleteIcon,
  onEditIconClose,
  onEditIconLabelChange,
  onEditIconSave,
  onAddIconClose,
  onAddIconSensorChange,
  onAddIconDepthChange,
  onAddIcon,
  onQrClose,
}: {
  site: any
  allSensors: any[]
  siteSensors: any[]
  icons: { key: string; label: string; x: number; y: number }[]
  addIconSensor: string
  addIconDepth: string
  editingIcon: { key: string; label: string } | null
  editingLabel: string
  qrSensor: { id: string; name: string } | null
  showAddSensor: boolean
  showRemoveSensor: boolean
  showDeleteIconModal: boolean
  showAddIcon: boolean
  onAddSensorClose: () => void
  onAddSensorSave: (ids: number[]) => void
  onRemoveSensorClose: () => void
  onRemoveSensor: (id: number) => void
  onDeleteIconClose: () => void
  onDeleteIcon: (key: string) => void
  onEditIconClose: () => void
  onEditIconLabelChange: (label: string) => void
  onEditIconSave: (key: string, label: string) => void
  onAddIconClose: () => void
  onAddIconSensorChange: (v: string) => void
  onAddIconDepthChange: (v: string) => void
  onAddIcon: () => void
  onQrClose: () => void
}) {
  return (
    <>
      {showAddSensor && (
        <AddSensorModal
          siteCode={site.site_code}
          allSensors={allSensors}
          onClose={onAddSensorClose}
          onSave={onAddSensorSave}
        />
      )}
      {showRemoveSensor && (
        <RemoveSensorModal
          siteSensors={siteSensors}
          onClose={onRemoveSensorClose}
          onRemove={onRemoveSensor}
        />
      )}
      {showDeleteIconModal && (
        <IconDeleteModal
          icons={icons}
          onDelete={onDeleteIcon}
          onClose={onDeleteIconClose}
        />
      )}
      {editingIcon && (
        <IconEditModal
          editingIcon={editingIcon}
          editingLabel={editingLabel}
          onLabelChange={onEditIconLabelChange}
          onSave={onEditIconSave}
          onClose={onEditIconClose}
        />
      )}
      {showAddIcon && (
        <IconAddModal
          siteSensors={siteSensors}
          allSensors={allSensors}
          addIconSensor={addIconSensor}
          addIconDepth={addIconDepth}
          onSensorChange={onAddIconSensorChange}
          onDepthChange={onAddIconDepthChange}
          onAdd={onAddIcon}
          onClose={onAddIconClose}
        />
      )}
      {qrSensor && (
        <QRModal
          sensorId={qrSensor.id}
          sensorName={qrSensor.name}
          onClose={onQrClose}
        />
      )}
    </>
  )
}
