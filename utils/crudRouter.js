const express = require('express');
const { Op } = require('sequelize');
const { paginate } = require('./paginate');

/**
 * Create a CRUD router factory for simple models
 * @param {Object} Model - Sequelize model
 * @param {Object} options - Configuration options
 */
function createCrudRouter(Model, options = {}) {
    const router = express.Router();
    const {
        viewPath = Model.tableName,
        title = Model.name,
        searchFields = [],
        orderBy = [['created_at', 'DESC']],
        selectFields = null
    } = options;

    // GET - List all
    router.get('/', async (req, res) => {
        try {
            const { search } = req.query;
            let where = {};

            if (search && searchFields.length > 0) {
                where = {
                    [Op.or]: searchFields.map(field => ({
                        [field]: { [Op.like]: `%${search}%` }
                    }))
                };
            }

            const { rows, pagination } = await paginate(Model, req, { where, order: orderBy });

            res.render(`${viewPath}/index`, {
                title: `${title} - SIMPELL`,
                data: rows,
                pagination,
                search: search || ''
            });
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal memuat data');
            res.redirect('/');
        }
    });

    // GET - Create form
    router.get('/create', async (req, res) => {
        let selectOptions = {};
        if (selectFields) {
            for (const field of selectFields) {
                const values = await Model.findAll({
                    attributes: [[field, 'value']],
                    group: [field],
                    raw: true
                });
                selectOptions[field] = values.map(v => v.value).filter(Boolean);
            }
        }

        res.render(`${viewPath}/form`, {
            title: `Tambah ${title} - SIMPELL`,
            data: null,
            selectOptions
        });
    });

    // POST - Create
    router.post('/', async (req, res) => {
        try {
            await Model.create(req.body);
            req.flash('success_msg', 'Data berhasil ditambahkan');
            res.redirect(`/${viewPath}`);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal menambahkan data: ' + error.message);
            res.redirect(`/${viewPath}/create`);
        }
    });

    // GET - Edit form
    router.get('/:id/edit', async (req, res) => {
        try {
            const data = await Model.findByPk(req.params.id);
            if (!data) {
                req.flash('error_msg', 'Data tidak ditemukan');
                return res.redirect(`/${viewPath}`);
            }

            let selectOptions = {};
            if (selectFields) {
                for (const field of selectFields) {
                    const values = await Model.findAll({
                        attributes: [[field, 'value']],
                        group: [field],
                        raw: true
                    });
                    selectOptions[field] = values.map(v => v.value).filter(Boolean);
                }
            }

            res.render(`${viewPath}/form`, {
                title: `Edit ${title} - SIMPELL`,
                data,
                selectOptions
            });
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal memuat data');
            res.redirect(`/${viewPath}`);
        }
    });

    // PUT - Update
    router.put('/:id', async (req, res) => {
        try {
            await Model.update(req.body, { where: { id: req.params.id } });
            req.flash('success_msg', 'Data berhasil diperbarui');
            res.redirect(`/${viewPath}`);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal memperbarui data');
            res.redirect(`/${viewPath}/${req.params.id}/edit`);
        }
    });

    // DELETE
    router.delete('/:id', async (req, res) => {
        try {
            await Model.destroy({ where: { id: req.params.id } });
            req.flash('success_msg', 'Data berhasil dihapus');
            res.redirect(`/${viewPath}`);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal menghapus data');
            res.redirect(`/${viewPath}`);
        }
    });

    // API endpoint for autocomplete
    router.get('/api/autocomplete/:field', async (req, res) => {
        try {
            const { field } = req.params;
            const { q } = req.query;

            const values = await Model.findAll({
                attributes: [[field, 'value']],
                where: q ? { [field]: { [Op.like]: `%${q}%` } } : {},
                group: [field],
                raw: true,
                limit: 10
            });

            res.json(values.map(v => v.value).filter(Boolean));
        } catch (error) {
            res.json([]);
        }
    });

    return router;
}

module.exports = { createCrudRouter };
