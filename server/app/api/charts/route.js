/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/charts/route";
exports.ids = ["app/api/charts/route"];
exports.modules = {

/***/ "(rsc)/./app/api/charts/route.ts":
/*!*********************************!*\
  !*** ./app/api/charts/route.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST),\n/* harmony export */   dynamic: () => (/* binding */ dynamic)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_s3__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/s3 */ \"(rsc)/./lib/s3.ts\");\n\n\n// For Next.js static export compatibility\nconst dynamic = \"error\";\n// Removed revalidate directive for static export\n// GET /api/charts - Get all charts\nasync function GET(req) {\n    try {\n        console.log(\"API: Fetching all charts from S3...\");\n        // Get all charts from S3\n        const chartKeys = await (0,_lib_s3__WEBPACK_IMPORTED_MODULE_1__.listFromS3)('charts/');\n        if (chartKeys.length > 0) {\n            const chartPromises = chartKeys.map((key)=>(0,_lib_s3__WEBPACK_IMPORTED_MODULE_1__.getFromS3)(key));\n            const charts = await Promise.all(chartPromises);\n            const validCharts = charts.filter((chart)=>chart !== null);\n            console.log(`API: Found ${validCharts.length} charts in S3`);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                charts: validCharts\n            });\n        }\n        // No charts found\n        console.log(\"API: No charts found in S3\");\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            charts: []\n        });\n    } catch (error) {\n        console.error('API: Error fetching charts:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Failed to fetch charts',\n            details: String(error)\n        }, {\n            status: 500\n        });\n    }\n}\n// POST /api/charts - Create a new chart\nasync function POST(req) {\n    try {\n        console.log(\"API: Creating new chart...\");\n        const chartConfig = await req.json();\n        // Log the chart config we're trying to save\n        console.log(`API: Saving chart with ID ${chartConfig.id}, title: ${chartConfig.title}`);\n        // Validate the chart config\n        if (!chartConfig.title || !chartConfig.page || !chartConfig.chartType) {\n            console.log(\"API: Invalid chart configuration - missing required fields\");\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Invalid chart configuration'\n            }, {\n                status: 400\n            });\n        }\n        // Update timestamps if not already set\n        chartConfig.updatedAt = new Date().toISOString();\n        if (!chartConfig.createdAt) {\n            chartConfig.createdAt = chartConfig.updatedAt;\n        }\n        // Save to S3\n        const s3Result = await (0,_lib_s3__WEBPACK_IMPORTED_MODULE_1__.saveToS3)(`charts/${chartConfig.id}.json`, chartConfig);\n        if (!s3Result) {\n            console.log(`API: Failed to save chart to S3`);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Failed to save chart to S3'\n            }, {\n                status: 500\n            });\n        }\n        console.log(`API: Chart saved successfully to S3 with ID ${chartConfig.id}`);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            message: 'Chart saved to S3 successfully',\n            chartId: chartConfig.id\n        });\n    } catch (error) {\n        console.error('API: Error creating/updating chart:', error);\n        // Provide more detailed error information\n        const errorMessage = error instanceof Error ? error.message : 'Unknown error';\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Failed to create/update chart',\n            details: errorMessage\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFpQmtCLFFBQ2xDbEIsTUFBTWUsT0FBTyxHQUNiO1FBRUosT0FBT3BDLHFEQUFZQSxDQUFDb0IsSUFBSSxDQUN0QjtZQUNFQyxPQUFPO1lBQ1BDLFNBQVNnQjtRQUNYLEdBQ0E7WUFBRWQsUUFBUTtRQUFJO0lBRWxCO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9sb2tlc2h0aXdhcmkvRGVza3RvcC9zb3Mvc3RhdGVfb2Zfc29sYW5hL2FwcC9hcGkvY2hhcnRzL3JvdXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXF1ZXN0LCBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcic7XG5pbXBvcnQgeyBDaGFydENvbmZpZyB9IGZyb20gJ0AvYXBwL2FkbWluL3R5cGVzJztcbmltcG9ydCB7IHNhdmVUb1MzLCBnZXRGcm9tUzMsIGxpc3RGcm9tUzMgfSBmcm9tICdAL2xpYi9zMyc7XG5cbi8vIEZvciBOZXh0LmpzIHN0YXRpYyBleHBvcnQgY29tcGF0aWJpbGl0eVxuZXhwb3J0IGNvbnN0IGR5bmFtaWMgPSBcImVycm9yXCI7XG4vLyBSZW1vdmVkIHJldmFsaWRhdGUgZGlyZWN0aXZlIGZvciBzdGF0aWMgZXhwb3J0XG5cbi8vIEdFVCAvYXBpL2NoYXJ0cyAtIEdldCBhbGwgY2hhcnRzXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKHJlcTogTmV4dFJlcXVlc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhcIkFQSTogRmV0Y2hpbmcgYWxsIGNoYXJ0cyBmcm9tIFMzLi4uXCIpO1xuICAgIFxuICAgIC8vIEdldCBhbGwgY2hhcnRzIGZyb20gUzNcbiAgICBjb25zdCBjaGFydEtleXMgPSBhd2FpdCBsaXN0RnJvbVMzKCdjaGFydHMvJyk7XG4gICAgaWYgKGNoYXJ0S2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBjaGFydFByb21pc2VzID0gY2hhcnRLZXlzLm1hcChrZXkgPT4gZ2V0RnJvbVMzPENoYXJ0Q29uZmlnPihrZXkpKTtcbiAgICAgIGNvbnN0IGNoYXJ0cyA9IGF3YWl0IFByb21pc2UuYWxsKGNoYXJ0UHJvbWlzZXMpO1xuICAgICAgY29uc3QgdmFsaWRDaGFydHMgPSBjaGFydHMuZmlsdGVyKGNoYXJ0ID0+IGNoYXJ0ICE9PSBudWxsKSBhcyBDaGFydENvbmZpZ1tdO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZyhgQVBJOiBGb3VuZCAke3ZhbGlkQ2hhcnRzLmxlbmd0aH0gY2hhcnRzIGluIFMzYCk7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBjaGFydHM6IHZhbGlkQ2hhcnRzIH0pO1xuICAgIH1cbiAgICBcbiAgICAvLyBObyBjaGFydHMgZm91bmRcbiAgICBjb25zb2xlLmxvZyhcIkFQSTogTm8gY2hhcnRzIGZvdW5kIGluIFMzXCIpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGNoYXJ0czogW10gfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQVBJOiBFcnJvciBmZXRjaGluZyBjaGFydHM6JywgZXJyb3IpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgIHsgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggY2hhcnRzJywgZGV0YWlsczogU3RyaW5nKGVycm9yKSB9LFxuICAgICAgeyBzdGF0dXM6IDUwMCB9XG4gICAgKTtcbiAgfVxufVxuXG4vLyBQT1NUIC9hcGkvY2hhcnRzIC0gQ3JlYXRlIGEgbmV3IGNoYXJ0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVChyZXE6IE5leHRSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJBUEk6IENyZWF0aW5nIG5ldyBjaGFydC4uLlwiKTtcbiAgICBjb25zdCBjaGFydENvbmZpZyA9IGF3YWl0IHJlcS5qc29uKCkgYXMgQ2hhcnRDb25maWc7XG4gICAgXG4gICAgLy8gTG9nIHRoZSBjaGFydCBjb25maWcgd2UncmUgdHJ5aW5nIHRvIHNhdmVcbiAgICBjb25zb2xlLmxvZyhgQVBJOiBTYXZpbmcgY2hhcnQgd2l0aCBJRCAke2NoYXJ0Q29uZmlnLmlkfSwgdGl0bGU6ICR7Y2hhcnRDb25maWcudGl0bGV9YCk7XG4gICAgXG4gICAgLy8gVmFsaWRhdGUgdGhlIGNoYXJ0IGNvbmZpZ1xuICAgIGlmICghY2hhcnRDb25maWcudGl0bGUgfHwgIWNoYXJ0Q29uZmlnLnBhZ2UgfHwgIWNoYXJ0Q29uZmlnLmNoYXJ0VHlwZSkge1xuICAgICAgY29uc29sZS5sb2coXCJBUEk6IEludmFsaWQgY2hhcnQgY29uZmlndXJhdGlvbiAtIG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzXCIpO1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICB7IGVycm9yOiAnSW52YWxpZCBjaGFydCBjb25maWd1cmF0aW9uJyB9LFxuICAgICAgICB7IHN0YXR1czogNDAwIH1cbiAgICAgICk7XG4gICAgfVxuICAgIFxuICAgIC8vIFVwZGF0ZSB0aW1lc3RhbXBzIGlmIG5vdCBhbHJlYWR5IHNldFxuICAgIGNoYXJ0Q29uZmlnLnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBpZiAoIWNoYXJ0Q29uZmlnLmNyZWF0ZWRBdCkge1xuICAgICAgY2hhcnRDb25maWcuY3JlYXRlZEF0ID0gY2hhcnRDb25maWcudXBkYXRlZEF0O1xuICAgIH1cbiAgICBcbiAgICAvLyBTYXZlIHRvIFMzXG4gICAgY29uc3QgczNSZXN1bHQgPSBhd2FpdCBzYXZlVG9TMyhgY2hhcnRzLyR7Y2hhcnRDb25maWcuaWR9Lmpzb25gLCBjaGFydENvbmZpZyk7XG4gICAgaWYgKCFzM1Jlc3VsdCkge1xuICAgICAgY29uc29sZS5sb2coYEFQSTogRmFpbGVkIHRvIHNhdmUgY2hhcnQgdG8gUzNgKTtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgICAgeyBlcnJvcjogJ0ZhaWxlZCB0byBzYXZlIGNoYXJ0IHRvIFMzJyB9LFxuICAgICAgICB7IHN0YXR1czogNTAwIH1cbiAgICAgICk7XG4gICAgfVxuICAgIFxuICAgIGNvbnNvbGUubG9nKGBBUEk6IENoYXJ0IHNhdmVkIHN1Y2Nlc3NmdWxseSB0byBTMyB3aXRoIElEICR7Y2hhcnRDb25maWcuaWR9YCk7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgXG4gICAgICBtZXNzYWdlOiAnQ2hhcnQgc2F2ZWQgdG8gUzMgc3VjY2Vzc2Z1bGx5JyxcbiAgICAgIGNoYXJ0SWQ6IGNoYXJ0Q29uZmlnLmlkXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQVBJOiBFcnJvciBjcmVhdGluZy91cGRhdGluZyBjaGFydDonLCBlcnJvcik7XG4gICAgXG4gICAgLy8gUHJvdmlkZSBtb3JlIGRldGFpbGVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciBcbiAgICAgID8gZXJyb3IubWVzc2FnZVxuICAgICAgOiAnVW5rbm93biBlcnJvcic7XG4gICAgXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgeyBcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gY3JlYXRlL3VwZGF0ZSBjaGFydCcsIFxuICAgICAgICBkZXRhaWxzOiBlcnJvck1lc3NhZ2VcbiAgICAgIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApO1xuICB9XG59ICJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJzYXZlVG9TMyIsImdldEZyb21TMyIsImxpc3RGcm9tUzMiLCJkeW5hbWljIiwiR0VUIiwicmVxIiwiY29uc29sZSIsImxvZyIsImNoYXJ0S2V5cyIsImxlbmd0aCIsImNoYXJ0UHJvbWlzZXMiLCJtYXAiLCJrZXkiLCJjaGFydHMiLCJQcm9taXNlIiwiYWxsIiwidmFsaWRDaGFydHMiLCJmaWx0ZXIiLCJjaGFydCIsImpzb24iLCJlcnJvciIsImRldGFpbHMiLCJTdHJpbmciLCJzdGF0dXMiLCJQT1NUIiwiY2hhcnRDb25maWciLCJpZCIsInRpdGxlIiwicGFnZSIsImNoYXJ0VHlwZSIsInVwZGF0ZWRBdCIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImNyZWF0ZWRBdCIsInMzUmVzdWx0IiwibWVzc2FnZSIsImNoYXJ0SWQiLCJlcnJvck1lc3NhZ2UiLCJFcnJvciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/charts/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/s3.ts":
/*!*******************!*\
  !*** ./lib/s3.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   deleteFromS3: () => (/* binding */ deleteFromS3),\n/* harmony export */   getFromS3: () => (/* binding */ getFromS3),\n/* harmony export */   listFromS3: () => (/* binding */ listFromS3),\n/* harmony export */   saveToS3: () => (/* binding */ saveToS3)\n/* harmony export */ });\n/* harmony import */ var aws_sdk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! aws-sdk */ \"(rsc)/./node_modules/aws-sdk/lib/aws.js\");\n/* harmony import */ var aws_sdk__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(aws_sdk__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _staticData__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./staticData */ \"(rsc)/./lib/staticData.ts\");\n\n\n// Configure AWS SDK\nconst s3 = new (aws_sdk__WEBPACK_IMPORTED_MODULE_0___default().S3)({\n    region: process.env.AWS_REGION || 'us-east-1',\n    credentials: {\n        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',\n        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''\n    }\n});\n// S3 bucket name\nconst BUCKET_NAME = 'tl-state-of-solana';\n// Determine if we're in production GitHub Pages environment\nconst isStaticDeployment =  false && (0);\n// Save JSON data to S3\nasync function saveToS3(key, data) {\n    // Don't attempt to save in static deployment\n    if (isStaticDeployment) {\n        console.warn('S3 write operations are not available in static deployments');\n        return false;\n    }\n    try {\n        const params = {\n            Bucket: BUCKET_NAME,\n            Key: key,\n            Body: JSON.stringify(data),\n            ContentType: 'application/json'\n        };\n        const result = await s3.upload(params).promise();\n        console.log(`Successfully uploaded data to ${result.Location}`);\n        return true;\n    } catch (error) {\n        console.error('Error uploading to S3:', error);\n        return false;\n    }\n}\n// Get JSON data from S3\nasync function getFromS3(key) {\n    // For static deployments, use mock data\n    if (isStaticDeployment) {\n        try {\n            // Convert S3 key to mock path\n            // Example: charts/chart_123.json -> /mock-data/charts/chart_123\n            const mockPath = `/mock-data/${key.replace(/\\.json$/, '')}`;\n            const mockData = await (0,_staticData__WEBPACK_IMPORTED_MODULE_1__.fetchStaticData)(mockPath);\n            return mockData;\n        } catch (error) {\n            console.error('Error fetching mock data:', error);\n            return null;\n        }\n    }\n    try {\n        const params = {\n            Bucket: BUCKET_NAME,\n            Key: key\n        };\n        const data = await s3.getObject(params).promise();\n        if (data.Body) {\n            return JSON.parse(data.Body.toString('utf-8'));\n        }\n        return null;\n    } catch (error) {\n        console.error('Error getting data from S3:', error);\n        return null;\n    }\n}\n// Delete an object from S3\nasync function deleteFromS3(key) {\n    // Don't attempt to delete in static deployment\n    if (isStaticDeployment) {\n        console.warn('S3 delete operations are not available in static deployments');\n        return false;\n    }\n    try {\n        const params = {\n            Bucket: BUCKET_NAME,\n            Key: key\n        };\n        await s3.deleteObject(params).promise();\n        console.log(`Successfully deleted ${key} from S3`);\n        return true;\n    } catch (error) {\n        console.error('Error deleting from S3:', error);\n        return false;\n    }\n}\n// List all objects with a specific prefix from S3\nasync function listFromS3(prefix) {\n    // For static deployments, return empty or mock data\n    if (isStaticDeployment) {\n        try {\n            // Use a pre-defined list of mock chart IDs for demonstration\n            if (prefix === 'charts/') {\n                return [\n                    'charts/sample_chart_1.json',\n                    'charts/sample_chart_2.json',\n                    'charts/sample_chart_3.json'\n                ];\n            }\n            return [];\n        } catch (error) {\n            console.error('Error listing mock data:', error);\n            return [];\n        }\n    }\n    try {\n        const params = {\n            Bucket: BUCKET_NAME,\n            Prefix: prefix\n        };\n        const data = await s3.listObjectsV2(params).promise();\n        return (data.Contents || []).map((item)=>item.Key || '').filter((key)=>key !== '');\n    } catch (error) {\n        console.error('Error listing objects from S3:', error);\n        return [];\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNMO29CQUNBO29CQUNBO2lCQUNEO1lBQ0g7WUFDQSxPQUFPLEVBQUU7UUFDWCxFQUFFLE9BQU9YLE9BQU87WUFDZGQsUUFBUWMsS0FBSyxDQUFDLDRCQUE0QkE7WUFDMUMsT0FBTyxFQUFFO1FBQ1g7SUFDRjtJQUVBLElBQUk7UUFDRixNQUFNWixTQUFTO1lBQ2JDLFFBQVFiO1lBQ1JvQyxRQUFRRDtRQUNWO1FBRUEsTUFBTTFCLE9BQU8sTUFBTXBCLEdBQUdnRCxhQUFhLENBQUN6QixRQUFRUyxPQUFPO1FBQ25ELE9BQU8sQ0FBQ1osS0FBSzZCLFFBQVEsSUFBSSxFQUFFLEVBQUVDLEdBQUcsQ0FBQ0MsQ0FBQUEsT0FBUUEsS0FBSzFCLEdBQUcsSUFBSSxJQUFJMkIsTUFBTSxDQUFDakMsQ0FBQUEsTUFBT0EsUUFBUTtJQUNqRixFQUFFLE9BQU9nQixPQUFPO1FBQ2RkLFFBQVFjLEtBQUssQ0FBQyxrQ0FBa0NBO1FBQ2hELE9BQU8sRUFBRTtJQUNYO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9sb2tlc2h0aXdhcmkvRGVza3RvcC9zb3Mvc3RhdGVfb2Zfc29sYW5hL2xpYi9zMy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQVdTIGZyb20gJ2F3cy1zZGsnO1xuaW1wb3J0IHsgZmV0Y2hTdGF0aWNEYXRhIH0gZnJvbSAnLi9zdGF0aWNEYXRhJztcblxuLy8gQ29uZmlndXJlIEFXUyBTREtcbmNvbnN0IHMzID0gbmV3IEFXUy5TMyh7XG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcbiAgY3JlZGVudGlhbHM6IHtcbiAgICBhY2Nlc3NLZXlJZDogcHJvY2Vzcy5lbnYuQVdTX0FDQ0VTU19LRVlfSUQgfHwgJycsXG4gICAgc2VjcmV0QWNjZXNzS2V5OiBwcm9jZXNzLmVudi5BV1NfU0VDUkVUX0FDQ0VTU19LRVkgfHwgJycsXG4gIH0sXG59KTtcblxuLy8gUzMgYnVja2V0IG5hbWVcbmNvbnN0IEJVQ0tFVF9OQU1FID0gJ3RsLXN0YXRlLW9mLXNvbGFuYSc7XG5cbi8vIERldGVybWluZSBpZiB3ZSdyZSBpbiBwcm9kdWN0aW9uIEdpdEh1YiBQYWdlcyBlbnZpcm9ubWVudFxuY29uc3QgaXNTdGF0aWNEZXBsb3ltZW50ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lLmluY2x1ZGVzKCdnaXRodWIuaW8nKSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19VU0VfU1RBVElDX0RBVEEgPT09ICd0cnVlJyk7XG5cbi8vIFNhdmUgSlNPTiBkYXRhIHRvIFMzXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVRvUzMoa2V5OiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAvLyBEb24ndCBhdHRlbXB0IHRvIHNhdmUgaW4gc3RhdGljIGRlcGxveW1lbnRcbiAgaWYgKGlzU3RhdGljRGVwbG95bWVudCkge1xuICAgIGNvbnNvbGUud2FybignUzMgd3JpdGUgb3BlcmF0aW9ucyBhcmUgbm90IGF2YWlsYWJsZSBpbiBzdGF0aWMgZGVwbG95bWVudHMnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgQnVja2V0OiBCVUNLRVRfTkFNRSxcbiAgICAgIEtleToga2V5LFxuICAgICAgQm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICBDb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIH07XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzMy51cGxvYWQocGFyYW1zKS5wcm9taXNlKCk7XG4gICAgY29uc29sZS5sb2coYFN1Y2Nlc3NmdWxseSB1cGxvYWRlZCBkYXRhIHRvICR7cmVzdWx0LkxvY2F0aW9ufWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwbG9hZGluZyB0byBTMzonLCBlcnJvcik7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8vIEdldCBKU09OIGRhdGEgZnJvbSBTM1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEZyb21TMzxUPihrZXk6IHN0cmluZyk6IFByb21pc2U8VCB8IG51bGw+IHtcbiAgLy8gRm9yIHN0YXRpYyBkZXBsb3ltZW50cywgdXNlIG1vY2sgZGF0YVxuICBpZiAoaXNTdGF0aWNEZXBsb3ltZW50KSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIENvbnZlcnQgUzMga2V5IHRvIG1vY2sgcGF0aFxuICAgICAgLy8gRXhhbXBsZTogY2hhcnRzL2NoYXJ0XzEyMy5qc29uIC0+IC9tb2NrLWRhdGEvY2hhcnRzL2NoYXJ0XzEyM1xuICAgICAgY29uc3QgbW9ja1BhdGggPSBgL21vY2stZGF0YS8ke2tleS5yZXBsYWNlKC9cXC5qc29uJC8sICcnKX1gO1xuICAgICAgY29uc3QgbW9ja0RhdGEgPSBhd2FpdCBmZXRjaFN0YXRpY0RhdGEobW9ja1BhdGgpO1xuICAgICAgcmV0dXJuIG1vY2tEYXRhIGFzIFQ7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIG1vY2sgZGF0YTonLCBlcnJvcik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgQnVja2V0OiBCVUNLRVRfTkFNRSxcbiAgICAgIEtleToga2V5LFxuICAgIH07XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgczMuZ2V0T2JqZWN0KHBhcmFtcykucHJvbWlzZSgpO1xuICAgIGlmIChkYXRhLkJvZHkpIHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEuQm9keS50b1N0cmluZygndXRmLTgnKSkgYXMgVDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBkYXRhIGZyb20gUzM6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8vIERlbGV0ZSBhbiBvYmplY3QgZnJvbSBTM1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUZyb21TMyhrZXk6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAvLyBEb24ndCBhdHRlbXB0IHRvIGRlbGV0ZSBpbiBzdGF0aWMgZGVwbG95bWVudFxuICBpZiAoaXNTdGF0aWNEZXBsb3ltZW50KSB7XG4gICAgY29uc29sZS53YXJuKCdTMyBkZWxldGUgb3BlcmF0aW9ucyBhcmUgbm90IGF2YWlsYWJsZSBpbiBzdGF0aWMgZGVwbG95bWVudHMnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgQnVja2V0OiBCVUNLRVRfTkFNRSxcbiAgICAgIEtleToga2V5LFxuICAgIH07XG5cbiAgICBhd2FpdCBzMy5kZWxldGVPYmplY3QocGFyYW1zKS5wcm9taXNlKCk7XG4gICAgY29uc29sZS5sb2coYFN1Y2Nlc3NmdWxseSBkZWxldGVkICR7a2V5fSBmcm9tIFMzYCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZGVsZXRpbmcgZnJvbSBTMzonLCBlcnJvcik7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8vIExpc3QgYWxsIG9iamVjdHMgd2l0aCBhIHNwZWNpZmljIHByZWZpeCBmcm9tIFMzXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdEZyb21TMyhwcmVmaXg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgLy8gRm9yIHN0YXRpYyBkZXBsb3ltZW50cywgcmV0dXJuIGVtcHR5IG9yIG1vY2sgZGF0YVxuICBpZiAoaXNTdGF0aWNEZXBsb3ltZW50KSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFVzZSBhIHByZS1kZWZpbmVkIGxpc3Qgb2YgbW9jayBjaGFydCBJRHMgZm9yIGRlbW9uc3RyYXRpb25cbiAgICAgIGlmIChwcmVmaXggPT09ICdjaGFydHMvJykge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICdjaGFydHMvc2FtcGxlX2NoYXJ0XzEuanNvbicsXG4gICAgICAgICAgJ2NoYXJ0cy9zYW1wbGVfY2hhcnRfMi5qc29uJyxcbiAgICAgICAgICAnY2hhcnRzL3NhbXBsZV9jaGFydF8zLmpzb24nXG4gICAgICAgIF07XG4gICAgICB9XG4gICAgICByZXR1cm4gW107XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxpc3RpbmcgbW9jayBkYXRhOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgQnVja2V0OiBCVUNLRVRfTkFNRSxcbiAgICAgIFByZWZpeDogcHJlZml4LFxuICAgIH07XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgczMubGlzdE9iamVjdHNWMihwYXJhbXMpLnByb21pc2UoKTtcbiAgICByZXR1cm4gKGRhdGEuQ29udGVudHMgfHwgW10pLm1hcChpdGVtID0+IGl0ZW0uS2V5IHx8ICcnKS5maWx0ZXIoa2V5ID0+IGtleSAhPT0gJycpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxpc3Rpbmcgb2JqZWN0cyBmcm9tIFMzOicsIGVycm9yKTtcbiAgICByZXR1cm4gW107XG4gIH1cbn0gIl0sIm5hbWVzIjpbIkFXUyIsImZldGNoU3RhdGljRGF0YSIsInMzIiwiUzMiLCJyZWdpb24iLCJwcm9jZXNzIiwiZW52IiwiQVdTX1JFR0lPTiIsImNyZWRlbnRpYWxzIiwiYWNjZXNzS2V5SWQiLCJBV1NfQUNDRVNTX0tFWV9JRCIsInNlY3JldEFjY2Vzc0tleSIsIkFXU19TRUNSRVRfQUNDRVNTX0tFWSIsIkJVQ0tFVF9OQU1FIiwiaXNTdGF0aWNEZXBsb3ltZW50Iiwid2luZG93IiwibG9jYXRpb24iLCJob3N0bmFtZSIsImluY2x1ZGVzIiwiTkVYVF9QVUJMSUNfVVNFX1NUQVRJQ19EQVRBIiwic2F2ZVRvUzMiLCJrZXkiLCJkYXRhIiwiY29uc29sZSIsIndhcm4iLCJwYXJhbXMiLCJCdWNrZXQiLCJLZXkiLCJCb2R5IiwiSlNPTiIsInN0cmluZ2lmeSIsIkNvbnRlbnRUeXBlIiwicmVzdWx0IiwidXBsb2FkIiwicHJvbWlzZSIsImxvZyIsIkxvY2F0aW9uIiwiZXJyb3IiLCJnZXRGcm9tUzMiLCJtb2NrUGF0aCIsInJlcGxhY2UiLCJtb2NrRGF0YSIsImdldE9iamVjdCIsInBhcnNlIiwidG9TdHJpbmciLCJkZWxldGVGcm9tUzMiLCJkZWxldGVPYmplY3QiLCJsaXN0RnJvbVMzIiwicHJlZml4IiwiUHJlZml4IiwibGlzdE9iamVjdHNWMiIsIkNvbnRlbnRzIiwibWFwIiwiaXRlbSIsImZpbHRlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/s3.ts\n");

/***/ }),

/***/ "(rsc)/./lib/staticData.ts":
/*!***************************!*\
  !*** ./lib/staticData.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   fetchBarStackData: () => (/* binding */ fetchBarStackData),\n/* harmony export */   fetchMultiSeriesData: () => (/* binding */ fetchMultiSeriesData),\n/* harmony export */   fetchSampleData: () => (/* binding */ fetchSampleData),\n/* harmony export */   fetchStackedData: () => (/* binding */ fetchStackedData),\n/* harmony export */   fetchStaticData: () => (/* binding */ fetchStaticData),\n/* harmony export */   fetchTimeSeriesData: () => (/* binding */ fetchTimeSeriesData),\n/* harmony export */   getBaseUrl: () => (/* binding */ getBaseUrl)\n/* harmony export */ });\n/**\n * A utility to fetch static mock data from the public folder\n * This is used as a fallback for API routes when using static export\n */ // Helper function to get the base URL\nfunction getBaseUrl() {\n    // In the browser, use the window location\n    if (false) {}\n    // In server context or during build, use an empty string\n    return '';\n}\n// Fetch data from mock JSON files in the public folder\nasync function fetchStaticData(endpoint) {\n    try {\n        // Convert API endpoint path to a mock data path\n        // Example: /api/chart-data/bar-stack-data -> /mock-data/bar-stack-data.json\n        const mockPath = endpoint.replace(/^\\/api\\//, '/mock-data/').replace(/\\/$/, '').concat('.json');\n        // Construct the full URL\n        const baseUrl = getBaseUrl();\n        const mockUrl = `${baseUrl}${mockPath}`;\n        console.log(`Fetching static data from: ${mockUrl}`);\n        // Fetch the data\n        const response = await fetch(mockUrl);\n        if (!response.ok) {\n            throw new Error(`Failed to fetch mock data: ${response.status}`);\n        }\n        return await response.json();\n    } catch (error) {\n        console.error('Error fetching static data:', error);\n        return null;\n    }\n}\n// Re-export specialized fetchers for specific data types\nconst fetchBarStackData = ()=>fetchStaticData('/api/chart-data/bar-stack-data');\nconst fetchMultiSeriesData = ()=>fetchStaticData('/api/chart-data/multi-series');\nconst fetchStackedData = ()=>fetchStaticData('/api/chart-data/stacked-data');\nconst fetchTimeSeriesData = ()=>fetchStaticData('/api/chart-data/time-series');\nconst fetchSampleData = ()=>fetchStaticData('/api/chart-data/sample');\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3RhdGljRGF0YS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7OztDQUdDLEdBRUQsc0NBQXNDO0FBQy9CLFNBQVNBO0lBQ2QsMENBQTBDO0lBQzFDLElBQUksS0FBNkIsRUFBRSxFQUlsQztJQUNELHlEQUF5RDtJQUN6RCxPQUFPO0FBQ1Q7QUFFQSx1REFBdUQ7QUFDaEQsZUFBZVMsZ0JBQWdCQyxRQUFnQjtJQUNwRCxJQUFJO1FBQ0YsZ0RBQWdEO1FBQ2hELDRFQUE0RTtRQUM1RSxNQUFNQyxXQUFXRCxTQUNkRSxPQUFPLENBQUMsWUFBWSxlQUNwQkEsT0FBTyxDQUFDLE9BQU8sSUFDZkMsTUFBTSxDQUFDO1FBRVYseUJBQXlCO1FBQ3pCLE1BQU1DLFVBQVVkO1FBQ2hCLE1BQU1lLFVBQVUsR0FBR0QsVUFBVUgsVUFBVTtRQUV2Q0ssUUFBUUMsR0FBRyxDQUFDLENBQUMsMkJBQTJCLEVBQUVGLFNBQVM7UUFFbkQsaUJBQWlCO1FBQ2pCLE1BQU1HLFdBQVcsTUFBTUMsTUFBTUo7UUFFN0IsSUFBSSxDQUFDRyxTQUFTRSxFQUFFLEVBQUU7WUFDaEIsTUFBTSxJQUFJQyxNQUFNLENBQUMsMkJBQTJCLEVBQUVILFNBQVNJLE1BQU0sRUFBRTtRQUNqRTtRQUVBLE9BQU8sTUFBTUosU0FBU0ssSUFBSTtJQUM1QixFQUFFLE9BQU9DLE9BQU87UUFDZFIsUUFBUVEsS0FBSyxDQUFDLCtCQUErQkE7UUFDN0MsT0FBTztJQUNUO0FBQ0Y7QUFFQSx5REFBeUQ7QUFDbEQsTUFBTUMsb0JBQW9CLElBQU1oQixnQkFBZ0Isa0NBQWtDO0FBQ2xGLE1BQU1pQix1QkFBdUIsSUFBTWpCLGdCQUFnQixnQ0FBZ0M7QUFDbkYsTUFBTWtCLG1CQUFtQixJQUFNbEIsZ0JBQWdCLGdDQUFnQztBQUMvRSxNQUFNbUIsc0JBQXNCLElBQU1uQixnQkFBZ0IsK0JBQStCO0FBQ2pGLE1BQU1vQixrQkFBa0IsSUFBTXBCLGdCQUFnQiwwQkFBMEIiLCJzb3VyY2VzIjpbIi9Vc2Vycy9sb2tlc2h0aXdhcmkvRGVza3RvcC9zb3Mvc3RhdGVfb2Zfc29sYW5hL2xpYi9zdGF0aWNEYXRhLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQSB1dGlsaXR5IHRvIGZldGNoIHN0YXRpYyBtb2NrIGRhdGEgZnJvbSB0aGUgcHVibGljIGZvbGRlclxuICogVGhpcyBpcyB1c2VkIGFzIGEgZmFsbGJhY2sgZm9yIEFQSSByb3V0ZXMgd2hlbiB1c2luZyBzdGF0aWMgZXhwb3J0XG4gKi9cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGdldCB0aGUgYmFzZSBVUkxcbmV4cG9ydCBmdW5jdGlvbiBnZXRCYXNlVXJsKCkge1xuICAvLyBJbiB0aGUgYnJvd3NlciwgdXNlIHRoZSB3aW5kb3cgbG9jYXRpb25cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc3QgYmFzZVBhdGhNYXRjaCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5tYXRjaCgvXihcXC9bXlxcL10rKS8pO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gYmFzZVBhdGhNYXRjaCA/IGJhc2VQYXRoTWF0Y2hbMV0gOiAnJztcbiAgICByZXR1cm4gYCR7d2luZG93LmxvY2F0aW9uLnByb3RvY29sfS8vJHt3aW5kb3cubG9jYXRpb24uaG9zdH0ke2Jhc2VQYXRofWA7XG4gIH1cbiAgLy8gSW4gc2VydmVyIGNvbnRleHQgb3IgZHVyaW5nIGJ1aWxkLCB1c2UgYW4gZW1wdHkgc3RyaW5nXG4gIHJldHVybiAnJztcbn1cblxuLy8gRmV0Y2ggZGF0YSBmcm9tIG1vY2sgSlNPTiBmaWxlcyBpbiB0aGUgcHVibGljIGZvbGRlclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoU3RhdGljRGF0YShlbmRwb2ludDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgdHJ5IHtcbiAgICAvLyBDb252ZXJ0IEFQSSBlbmRwb2ludCBwYXRoIHRvIGEgbW9jayBkYXRhIHBhdGhcbiAgICAvLyBFeGFtcGxlOiAvYXBpL2NoYXJ0LWRhdGEvYmFyLXN0YWNrLWRhdGEgLT4gL21vY2stZGF0YS9iYXItc3RhY2stZGF0YS5qc29uXG4gICAgY29uc3QgbW9ja1BhdGggPSBlbmRwb2ludFxuICAgICAgLnJlcGxhY2UoL15cXC9hcGlcXC8vLCAnL21vY2stZGF0YS8nKVxuICAgICAgLnJlcGxhY2UoL1xcLyQvLCAnJylcbiAgICAgIC5jb25jYXQoJy5qc29uJyk7XG4gICAgXG4gICAgLy8gQ29uc3RydWN0IHRoZSBmdWxsIFVSTFxuICAgIGNvbnN0IGJhc2VVcmwgPSBnZXRCYXNlVXJsKCk7XG4gICAgY29uc3QgbW9ja1VybCA9IGAke2Jhc2VVcmx9JHttb2NrUGF0aH1gO1xuICAgIFxuICAgIGNvbnNvbGUubG9nKGBGZXRjaGluZyBzdGF0aWMgZGF0YSBmcm9tOiAke21vY2tVcmx9YCk7XG4gICAgXG4gICAgLy8gRmV0Y2ggdGhlIGRhdGFcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKG1vY2tVcmwpO1xuICAgIFxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGZldGNoIG1vY2sgZGF0YTogJHtyZXNwb25zZS5zdGF0dXN9YCk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgc3RhdGljIGRhdGE6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8vIFJlLWV4cG9ydCBzcGVjaWFsaXplZCBmZXRjaGVycyBmb3Igc3BlY2lmaWMgZGF0YSB0eXBlc1xuZXhwb3J0IGNvbnN0IGZldGNoQmFyU3RhY2tEYXRhID0gKCkgPT4gZmV0Y2hTdGF0aWNEYXRhKCcvYXBpL2NoYXJ0LWRhdGEvYmFyLXN0YWNrLWRhdGEnKTtcbmV4cG9ydCBjb25zdCBmZXRjaE11bHRpU2VyaWVzRGF0YSA9ICgpID0+IGZldGNoU3RhdGljRGF0YSgnL2FwaS9jaGFydC1kYXRhL211bHRpLXNlcmllcycpO1xuZXhwb3J0IGNvbnN0IGZldGNoU3RhY2tlZERhdGEgPSAoKSA9PiBmZXRjaFN0YXRpY0RhdGEoJy9hcGkvY2hhcnQtZGF0YS9zdGFja2VkLWRhdGEnKTtcbmV4cG9ydCBjb25zdCBmZXRjaFRpbWVTZXJpZXNEYXRhID0gKCkgPT4gZmV0Y2hTdGF0aWNEYXRhKCcvYXBpL2NoYXJ0LWRhdGEvdGltZS1zZXJpZXMnKTtcbmV4cG9ydCBjb25zdCBmZXRjaFNhbXBsZURhdGEgPSAoKSA9PiBmZXRjaFN0YXRpY0RhdGEoJy9hcGkvY2hhcnQtZGF0YS9zYW1wbGUnKTsgIl0sIm5hbWVzIjpbImdldEJhc2VVcmwiLCJiYXNlUGF0aE1hdGNoIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsIm1hdGNoIiwiYmFzZVBhdGgiLCJwcm90b2NvbCIsImhvc3QiLCJmZXRjaFN0YXRpY0RhdGEiLCJlbmRwb2ludCIsIm1vY2tQYXRoIiwicmVwbGFjZSIsImNvbmNhdCIsImJhc2VVcmwiLCJtb2NrVXJsIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiZmV0Y2giLCJvayIsIkVycm9yIiwic3RhdHVzIiwianNvbiIsImVycm9yIiwiZmV0Y2hCYXJTdGFja0RhdGEiLCJmZXRjaE11bHRpU2VyaWVzRGF0YSIsImZldGNoU3RhY2tlZERhdGEiLCJmZXRjaFRpbWVTZXJpZXNEYXRhIiwiZmV0Y2hTYW1wbGVEYXRhIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/staticData.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcharts%2Froute&page=%2Fapi%2Fcharts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcharts%2Froute.ts&appDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=export&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcharts%2Froute&page=%2Fapi%2Fcharts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcharts%2Froute.ts&appDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=export&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_lokeshtiwari_Desktop_sos_state_of_solana_app_api_charts_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/charts/route.ts */ \"(rsc)/./app/api/charts/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"export\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/charts/route\",\n        pathname: \"/api/charts\",\n        filename: \"route\",\n        bundlePath: \"app/api/charts/route\"\n    },\n    resolvedPagePath: \"/Users/lokeshtiwari/Desktop/sos/state_of_solana/app/api/charts/route.ts\",\n    nextConfigOutput,\n    userland: _Users_lokeshtiwari_Desktop_sos_state_of_solana_app_api_charts_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZjaGFydHMlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmNoYXJ0cyUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmNoYXJ0cyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmxva2VzaHRpd2FyaSUyRkRlc2t0b3AlMkZzb3MlMkZzdGF0ZV9vZl9zb2xhbmElMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGbG9rZXNodGl3YXJpJTJGRGVza3RvcCUyRnNvcyUyRnN0YXRlX29mX3NvbGFuYSZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD1leHBvcnQmcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDdUI7QUFDcEc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9sb2tlc2h0aXdhcmkvRGVza3RvcC9zb3Mvc3RhdGVfb2Zfc29sYW5hL2FwcC9hcGkvY2hhcnRzL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcImV4cG9ydFwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9jaGFydHMvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9jaGFydHNcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2NoYXJ0cy9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9sb2tlc2h0aXdhcmkvRGVza3RvcC9zb3Mvc3RhdGVfb2Zfc29sYW5hL2FwcC9hcGkvY2hhcnRzL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcharts%2Froute&page=%2Fapi%2Fcharts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcharts%2Froute.ts&appDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=export&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "dgram":
/*!************************!*\
  !*** external "dgram" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("dgram");

/***/ }),

/***/ "domain":
/*!*************************!*\
  !*** external "domain" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("domain");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "string_decoder":
/*!*********************************!*\
  !*** external "string_decoder" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("string_decoder");

/***/ }),

/***/ "timers":
/*!*************************!*\
  !*** external "timers" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("timers");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/aws-sdk","vendor-chunks/xmlbuilder","vendor-chunks/uuid","vendor-chunks/xml2js","vendor-chunks/sax","vendor-chunks/jmespath"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcharts%2Froute&page=%2Fapi%2Fcharts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcharts%2Froute.ts&appDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Flokeshtiwari%2FDesktop%2Fsos%2Fstate_of_solana&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=export&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();