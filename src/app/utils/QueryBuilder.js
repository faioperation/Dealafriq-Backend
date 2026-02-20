import { excludeFields } from "../constant.js";




export class QueryBuilder {
  constructor(query) {
    this.query = query;
    this.where = {};
    this.orderBy = undefined;
    this.select = undefined;
    this.skip = undefined;
    this.take = undefined;
  }

  filter(relationConfig = {}) {
    const filters = { ...this.query };

    // Remove standard internal fields and manually excluded fields
    const fieldsToExclude = ["searchTerm", "searchParam", "sort", "orderBy", "page", "limit", "fields", "skip", "take", ...excludeFields];
    fieldsToExclude.forEach((field) => delete filters[field]);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        let isRelational = false;

        // Check if the key belongs to a relation based on config
        for (const [relation, fields] of Object.entries(relationConfig)) {
          if (fields.includes(key)) {
            this.where[relation] = {
              ...(this.where[relation] || {}),
              [key]: value,
            };
            isRelational = true;
            break;
          }
        }

        if (!isRelational) {
          this.where[key] = value;
        }
      }
    });

    return this;
  }

  fields() {
    const fields = this.query.fields;
    if (fields) {
      const selectObj = {};
      fields.split(",").forEach((field) => {
        selectObj[field.trim()] = true;
      });
      this.select = selectObj;
    }
    return this;
  }


  search(searchConfig = []) {
    const searchTerm = this.query.searchTerm || this.query.searchParam ;
    if (!searchTerm || !searchConfig.length) return this;

    this.where.OR = searchConfig.map(field => {
      // Normal field
      if (typeof field === "string") {
        return {
          [field]: {
            contains: searchTerm,
            mode: "insensitive",
          },
        };
      }

      // Relation field
      if (typeof field === "object") {
        const relation = Object.keys(field)[0];
        const relationFields = field[relation];

        return {
          [relation]: {
            OR: relationFields.map(rf => ({
              [rf]: {
                contains: searchTerm,
                mode: "insensitive",
              },
            })),
          },
        };
      }
    });

    return this;
  }

  sort(defaultSort = "createdAt", relationConfig = {}) {
    let sort = this.query.sort || defaultSort;

    const sortFields = sort.split(",").map((field) => {
      field = field.trim();
      let order = "asc";
      let column = field;

      // Handle "-from" -> from desc
      if (field.startsWith("-")) {
        column = field.slice(1);
        order = "desc";
      } else {
        // Handle "from desc"
        const parts = field.split(/\s+/);
        if (parts.length > 1) {
          column = parts[0];
          order = parts[1].toLowerCase() === "desc" ? "desc" : "asc";
        } else if (field.toLowerCase() === "desc" || field.toLowerCase() === "asc") {
          // If only "desc" is passed, use default field
          return { [defaultSort]: field.toLowerCase() };
        }
      }

      // Check if the column belongs to a relation
      for (const [relation, fields] of Object.entries(relationConfig)) {
        if (fields.includes(column)) {
          return {
            [relation]: {
              [column]: order,
            },
          };
        }
      }

      return { [column]: order };
    });

    this.orderBy = sortFields.length > 1 ? sortFields : sortFields[0];

    return this;
  }

  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    this.skip = (page - 1) * limit;
    this.take = limit;

    return this;
  }

  build() {
    return {
      where: this.where,
      orderBy: this.orderBy,
      select: this.select,
      skip: this.skip,
      take: this.take,
    };
  }

  getMeta(total) {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    return {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
  }
}
