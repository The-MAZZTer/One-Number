import * as JsStore from "jsstore";

export const dbSchema: JsStore.IDataBase = {
	name: "database",
	tables: [{
		name: "folders",
		columns: {
			id: {
				primaryKey: true,
				autoIncrement: true,
				dataType: JsStore.DATA_TYPE.Number
			},
			parentId: {
				dataType: JsStore.DATA_TYPE.Number
			},
			name: {
				dataType: JsStore.DATA_TYPE.String,
				notNull: true
			}
		}
	}, {
		name: "feeds",
		columns: {
			id: {
				primaryKey: true,
				autoIncrement: true,
				dataType: JsStore.DATA_TYPE.Number
			},
			parentId: {
				dataType: JsStore.DATA_TYPE.Number
			},
			type: {
				dataType: JsStore.DATA_TYPE.String,
				notNull: true,
				enableSearch: false
			},
			icon: {
				dataType: JsStore.DATA_TYPE.String,
				enableSearch: false				
			},
			name: {
				dataType: JsStore.DATA_TYPE.String,
				notNull: true
			},
			overrideName: {
				dataType: JsStore.DATA_TYPE.String
			},
			queryInterval: {
				dataType: JsStore.DATA_TYPE.Number
			},
			notificiation: {
				dataType: JsStore.DATA_TYPE.Number,
				enableSearch: false
			},
			description: {
				dataType: JsStore.DATA_TYPE.String
			},
			nextRefresh: {
				dataType: JsStore.DATA_TYPE.DateTime
			},
			lastUpdated: {
				dataType: JsStore.DATA_TYPE.DateTime,
				enableSearch: false
			},
			lastError: {
				dataType: JsStore.DATA_TYPE.String
			}
		}
	}, {
		name: "feedItems",
		columns: {
			id: {
				primaryKey: true,
				autoIncrement: true,
				dataType: JsStore.DATA_TYPE.Number
			},
			feedId: {
				dataType: JsStore.DATA_TYPE.Number,
				notNull: true
			},
			type: {
				dataType: JsStore.DATA_TYPE.String,
				notNull: true,
				enableSearch: false
			},
			guid: {
				dataType: JsStore.DATA_TYPE.String,
				notNull: true
			},
			name:{
				dataType: JsStore.DATA_TYPE.String,
				notNull: true
			},
			url: {
				dataType: JsStore.DATA_TYPE.String
			},
			published: {
				dataType: JsStore.DATA_TYPE.DateTime,
				notNull: true
			},
			author: {
				dataType: JsStore.DATA_TYPE.String
			},
			content: {
				dataType: JsStore.DATA_TYPE.String
			},
			read :{
				dataType: JsStore.DATA_TYPE.DateTime
			},
			star: {
				dataType: JsStore.DATA_TYPE.Number
			}
		}
	}]
};