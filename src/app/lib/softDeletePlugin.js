const softDeletePlugin = (schema, options) => {
    schema.add({
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
    });

    // Soft Delete Method
    schema.methods.softDelete = async function () {
        this.isDeleted = true;
        this.deletedAt = new Date();
        await this.save();
    };

    // Restore Method
    schema.methods.restore = async function () {
        this.isDeleted = false;
        this.deletedAt = null;
        await this.save();
    };

    // Default Query Modification
    schema.pre(/^find/, function (next) {
        this.find({ isDeleted: { $ne: true } });
        next();
    });

    // Adding Index for Faster Queries
    schema.index({ isDeleted: 1 });
}

export default softDeletePlugin;