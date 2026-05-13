import { ClientService } from "./client.service.js";
import { buildFileUrl } from "../../../utils/buildFileUrl.js";

const createClientController = async (req, res, next) => {
    try {
        const clientData = { ...req.body };
        const files = req.files;
        const user = req.user;

        // Handle Photo
        if (files?.photo?.[0]) {
            const filePath = `uploads/${files.photo[0].filename}`;
            clientData.photoPath = filePath;
            clientData.photoUrl = buildFileUrl(filePath, req);
        }

        // Handle Documents (Array of objects)
        const documents = [];
        if (files?.documents) {
            files.documents.forEach(file => {
                const filePath = `uploads/${file.filename}`;
                documents.push({
                    name: file.originalname,
                    fileUrl: buildFileUrl(filePath, req),
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                });
            });
        }
        clientData.documents = documents;

        // Handle SLAs (Array of objects)
        const slas = [];
        if (files?.slas) {
            files.slas.forEach(file => {
                const filePath = `uploads/${file.filename}`;
                slas.push({
                    name: file.originalname,
                    fileUrl: buildFileUrl(filePath, req),
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                });
            });
        }
        clientData.slas = slas;

        // Parse numeric fields
        if (clientData.numberOfProjects) clientData.numberOfProjects = parseInt(clientData.numberOfProjects);
        if (clientData.contactProjects) clientData.contactProjects = parseInt(clientData.contactProjects);

        // Handle Project IDs (could be string [e.g. from Postman form-data] or actual array)
        if (clientData.projectIds && typeof clientData.projectIds === 'string') {
            try {
                // If it's a JSON array string, parse it
                if (clientData.projectIds.trim().startsWith('[')) {
                    clientData.projectIds = JSON.parse(clientData.projectIds);
                } else {
                    // It's a single ID string, wrap it in an array
                    clientData.projectIds = [clientData.projectIds];
                }
            } catch (e) {
                // Fallback to single ID if parsing fails
                clientData.projectIds = [clientData.projectIds];
            }
        }

        const client = await ClientService.createClient(clientData, user);

        res.status(201).json({
            success: true,
            message: "Client created successfully",
            data: client
        });
    } catch (error) {
        next(error);
    }
};

const getAllClientsController = async (req, res, next) => {
    try {
        const clients = await ClientService.getAllClients(req.query);
        res.status(200).json({
            success: true,
            message: "Clients retrieved successfully",
            data: clients
        });
    } catch (error) {
        next(error);
    }
};

const getClientByIdController = async (req, res, next) => {
    try {
        const client = await ClientService.getClientById(req.params.id);
        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Client retrieved successfully",
            data: client
        });
    } catch (error) {
        next(error);
    }
};

const updateClientController = async (req, res, next) => {
    try {
        const clientData = { ...req.body };
        const files = req.files;
        const user = req.user;

        if (files?.photo?.[0]) {
            const filePath = `uploads/${files.photo[0].filename}`;
            clientData.photoPath = filePath;
            clientData.photoUrl = buildFileUrl(filePath, req);
        }

        // Logic for merging or replacing documents/slas could be complex.
        // For simplicity, we'll replace them if new ones are uploaded.
        if (files?.documents) {
            clientData.documents = files.documents.map(file => {
                const filePath = `uploads/${file.filename}`;
                return {
                    name: file.originalname,
                    fileUrl: buildFileUrl(filePath, req),
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                };
            });
        }

        if (files?.slas) {
            clientData.slas = files.slas.map(file => {
                const filePath = `uploads/${file.filename}`;
                return {
                    name: file.originalname,
                    fileUrl: buildFileUrl(filePath, req),
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                };
            });
        }

        if (clientData.numberOfProjects) clientData.numberOfProjects = parseInt(clientData.numberOfProjects);
        if (clientData.contactProjects) clientData.contactProjects = parseInt(clientData.contactProjects);

        if (clientData.projectIds && typeof clientData.projectIds === 'string') {
            try {
                if (clientData.projectIds.trim().startsWith('[')) {
                    clientData.projectIds = JSON.parse(clientData.projectIds);
                } else {
                    clientData.projectIds = [clientData.projectIds];
                }
            } catch (e) {
                clientData.projectIds = [clientData.projectIds];
            }
        }

        const client = await ClientService.updateClient(req.params.id, clientData, user);

        res.status(200).json({
            success: true,
            message: "Client updated successfully",
            data: client
        });
    } catch (error) {
        next(error);
    }
};

const deleteClientController = async (req, res, next) => {
    try {
        await ClientService.deleteClient(req.params.id, req.user);
        res.status(200).json({
            success: true,
            message: "Client deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const ClientController = {
    createClientController,
    getAllClientsController,
    getClientByIdController,
    updateClientController,
    deleteClientController
};
