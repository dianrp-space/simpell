const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const CoreLamda = require('./CoreLamda');
const CoreLamdaSegment = require('./CoreLamdaSegment');
const CoreLamdaSegmentName = require('./CoreLamdaSegmentName');
const Odc = require('./Odc');
const OdcCore = require('./OdcCore');
const { AksesFo, AksesFoNode } = require('./AksesFo');
const AksesVsatStarlink = require('./AksesVsatStarlink');
const AksesM2m = require('./AksesM2m');
const AksesVsatTdma = require('./AksesVsatTdma');
const AsetFo = require('./AsetFo');
const DataHh = require('./DataHh');
const DataClosure = require('./DataClosure');
const DataOdp = require('./DataOdp');

const OtbCentral = require('./OtbCentral');
const OtbPhd = require('./OtbPhd');
const CoreProjectCentral = require('./CoreProjectCentral');
const CoreProjectCore = require('./CoreProjectCore');
const PendingGgn = require('./PendingGgn');
const QcPsb = require('./QcPsb');
const MsFo = require('./MsFo');
const PendingMsFo = require('./PendingMsFo');
const PmMsFo = require('./PmMsFo');
const DataSpliter = require('./DataSpliter');
const RecordGgn = require('./RecordGgn');
const { DataCore, DataCoreSector } = require('./DataCore');
const Pelanggan = require('./Pelanggan');
const Cpe = require('./Cpe');
const RadioLinkAp = require('./RadioLinkAp');
const RadioLinkClient = require('./RadioLinkClient');
const AksesThirdParty = require('./AksesThirdParty');
const Patroli = require('./Patroli');
const ActivityLog = require('./ActivityLog');
const PasswordResetRequest = require('./PasswordResetRequest');
const AdminNotification = require('./AdminNotification');

// Define associations

// CoreLamda has many CoreLamdaSegments
CoreLamda.hasMany(CoreLamdaSegment, {
    foreignKey: 'core_lamda_id',
    as: 'segments',
    onDelete: 'CASCADE'
});
CoreLamdaSegment.belongsTo(CoreLamda, {
    foreignKey: 'core_lamda_id',
    as: 'coreLamda'
});

// CoreLamda has many CoreLamdaSegmentNames (shared segment names)
CoreLamda.hasMany(CoreLamdaSegmentName, {
    foreignKey: 'core_lamda_id',
    as: 'segmentNames',
    onDelete: 'CASCADE'
});
CoreLamdaSegmentName.belongsTo(CoreLamda, {
    foreignKey: 'core_lamda_id',
    as: 'coreLamda'
});

// CoreLamdaSegment belongs to CoreLamdaSegmentName
CoreLamdaSegment.belongsTo(CoreLamdaSegmentName, {
    foreignKey: 'segment_name_id',
    as: 'segmentName'
});
CoreLamdaSegmentName.hasMany(CoreLamdaSegment, {
    foreignKey: 'segment_name_id',
    as: 'coreSegments'
});

// Odc has many OdcCores
Odc.hasMany(OdcCore, {
    foreignKey: 'odc_id',
    as: 'cores',
    onDelete: 'CASCADE'
});
OdcCore.belongsTo(Odc, {
    foreignKey: 'odc_id',
    as: 'odc'
});

// OTB Central has many OtbPhd (Sectors)
OtbCentral.hasMany(OtbPhd, {
    foreignKey: 'central_id',
    as: 'sectors',
    onDelete: 'CASCADE'
});
OtbPhd.belongsTo(OtbCentral, {
    foreignKey: 'central_id',
    as: 'central'
});

CoreProjectCentral.hasMany(CoreProjectCore, {
    foreignKey: 'central_id',
    as: 'sectors',
    onDelete: 'CASCADE'
});
CoreProjectCore.belongsTo(CoreProjectCentral, {
    foreignKey: 'central_id',
    as: 'central'
});

// Pelanggan relationships - services linked to customers
Pelanggan.hasMany(AksesFo, { foreignKey: 'pelanggan_id', as: 'aksesFoList' });
AksesFo.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

Pelanggan.hasMany(AksesVsatStarlink, { foreignKey: 'pelanggan_id', as: 'vsatStarlinkList' });
AksesVsatStarlink.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

Pelanggan.hasMany(AksesM2m, { foreignKey: 'pelanggan_id', as: 'm2mList' });
AksesM2m.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

Pelanggan.hasMany(AksesVsatTdma, { foreignKey: 'pelanggan_id', as: 'vsatTdmaList' });
AksesVsatTdma.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

Pelanggan.hasMany(PendingGgn, { foreignKey: 'pelanggan_id', as: 'pendingGgnList' });
PendingGgn.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

Pelanggan.hasMany(RecordGgn, { foreignKey: 'pelanggan_id', as: 'recordGgnList' });
RecordGgn.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

Pelanggan.hasMany(Cpe, { foreignKey: 'pelanggan_id', as: 'cpeList' });
Cpe.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

// Radio Link Associations
RadioLinkAp.hasMany(RadioLinkClient, { foreignKey: 'radio_link_ap_id', as: 'clients' });
RadioLinkClient.belongsTo(RadioLinkAp, { foreignKey: 'radio_link_ap_id', as: 'ap' });

Pelanggan.hasMany(RadioLinkClient, { foreignKey: 'pelanggan_id', as: 'radioLinkList' });
RadioLinkClient.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

Pelanggan.hasMany(AksesThirdParty, { foreignKey: 'pelanggan_id', as: 'aksesThirdPartyList' });
AksesThirdParty.belongsTo(Pelanggan, { foreignKey: 'pelanggan_id', as: 'pelanggan' });

// Activity Log and Password Reset Associations
User.hasMany(ActivityLog, { foreignKey: 'user_id', as: 'logs' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PasswordResetRequest, { foreignKey: 'user_id', as: 'resetRequests' });
PasswordResetRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

const { decimalCoordinate, decimalCoordinateText } = require('../utils/coordinates');

// Kolom koordinat boleh diisi desimal atau DMS. DMS diubah ke desimal saat simpan.
// Isian kosong menjadi null supaya MySQL tidak menolak string kosong.
function blankOptionalFields(model, values) {
    if (!values || !model.rawAttributes) return;
    Object.keys(values).forEach((field) => {
        const attr = model.rawAttributes[field];
        if (!attr || attr.allowNull === false) return;
        const typeKey = attr.type && attr.type.key;
        const coordinate = field === 'latitude' || field === 'longitude' || field === 'koordinat' || field === 'lat_long';
        const date = typeKey === 'DATE' || typeKey === 'DATEONLY';
        const integer = typeKey === 'INTEGER';
        if (!coordinate && !date && !integer) return;
        const value = values[field];
        if (value === undefined || value === null) return;
        if (field === 'latitude' || field === 'longitude') {
            values[field] = decimalCoordinate(value, field);
            return;
        }
        if (field === 'koordinat' || field === 'lat_long') {
            values[field] = decimalCoordinateText(value);
            return;
        }
        if (String(value).trim() === '') values[field] = null;
    });
}

function keepBlankCoordinatesOptional(model) {
    const names = model.rawAttributes || {};
    const hasCoordinate = ['latitude', 'longitude', 'koordinat', 'lat_long'].some((field) => names[field]);
    if (!hasCoordinate) return;
    model.addHook('beforeValidate', (instance) => blankOptionalFields(model, instance.dataValues));
    model.addHook('beforeBulkUpdate', (options) => blankOptionalFields(model, options.attributes));
}

[
    Odc, AksesM2m, DataHh, DataClosure, DataOdp, PendingGgn,
    MsFo, DataCore, DataCoreSector, Pelanggan, RadioLinkAp, RadioLinkClient
].forEach(keepBlankCoordinatesOptional);

// Export all models
module.exports = {
    sequelize,
    User,
    CoreLamda,
    CoreLamdaSegment,
    CoreLamdaSegmentName,
    Odc,
    OdcCore,
    AksesFo,
    AksesFoNode,
    AksesVsatStarlink,
    AksesM2m,
    AksesVsatTdma,
    AsetFo,
    DataHh,
    DataClosure,
    DataOdp,

    OtbCentral,
    OtbPhd,
    CoreProjectCentral,
    CoreProjectCore,
    PendingGgn,
    QcPsb,
    MsFo,
    PendingMsFo,
    PmMsFo,
    DataSpliter,
    RecordGgn,
    DataCore,
    DataCoreSector,
    Pelanggan,
    Cpe,
    RadioLinkAp,
    RadioLinkClient,
    AksesThirdParty,
    Patroli,
    ActivityLog,
    PasswordResetRequest,
    AdminNotification
};
