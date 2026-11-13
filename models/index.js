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
const PendingGgn = require('./PendingGgn');
const QcPsb = require('./QcPsb');
const MsFo = require('./MsFo');
const PendingMsFo = require('./PendingMsFo');
const PmMsFo = require('./PmMsFo');
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
    PendingGgn,
    QcPsb,
    MsFo,
    PendingMsFo,
    PmMsFo,
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
