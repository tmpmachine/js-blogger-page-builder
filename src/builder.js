// @ts-check

function appBuilder(options) {
	// #vars
	let $ = document.querySelector.bind(document);
	let devTemplate = null;
	let widgets = [];
	let dataDoc = document;
	let dataMap = [];
	let countMap = 0;
	let downloadableTemplate = null;
	let _globalData = {};
	let _isDevelopment = location.port ? true : false;

	// #function

	function readChildData(node, data) {
		let branchNodes = node.querySelectorAll('& > data');

		branchNodes.forEach((branchNode) => readBranchNode(branchNode, data));
	}

	function readChildArray(node, items) {
		let branchNodes = node.querySelectorAll('& > data');
		let data = {};

		branchNodes.forEach((branchNode) => readBranchNode(branchNode, data));

		items.push(data);
	}

	function readBranchNode(branchNode, data) {
		let key = branchNode.getAttribute('key');

		if (!key) return;

		if (key.endsWith('[]')) {
			let items = [];

			for (let twigNode of branchNode.querySelectorAll('& > div')) {
				readChildArray(twigNode, items);
			}

			data[key.replace('[]', '')] = items;
		} else {
			dataMap[countMap++] = branchNode;
			data[key] = countMap - 1;
		}
	}

	// #load data
	function loadData() {
		let nodes = dataDoc.querySelectorAll('.WidgetData');

		for (let node of nodes) {
			let widget = widgets.find((e) => e.id == node.id);

			if (!widget) {
				widget = {
					id: node.id,
					title: node.content.querySelector('[slot="title"]')?.textContent.trim(),
					sectionId: node.parentElement?.parentElement?.id,
					data: {},
				};
				widgets.push(widget);
			}

			readChildData(node.content.firstElementChild, widget.data);
		}
	}

	// #builder
	const widgetBase = {
		templateSelector: '',
		templadeNode: null,
		isReady: false,
		data: {},
		build() {
			let docFrag = document.createDocumentFragment();
			let templateNode = this.templateNode ?? devTemplate.querySelector(this.templateSelector);

			if (!templateNode) {
				return docFrag;
			}

			let data = this.data;
			let containerEl =
				(templateNode.content ?? templateNode).cloneNode(true) ?? document.createDocumentFragment();

			removeConditionalWidgets(containerEl, data);
			fillDataSlots(containerEl, data);

			docFrag.append(containerEl);

			return docFrag;
		},
	};

	async function replaceFileTags_(containerEl) {
		for (let el of containerEl.content.querySelectorAll('file')) {
			let src = el.getAttribute('src');

			if (!src) {
				el.remove();
				continue;
			}

			await new Promise((resolve) => {
				fetch(src)
					.then((r) => r.text())
					.then((r) => {
						let docEl = document.createElement('div');
						docEl.innerHTML = r;

						el.insertAdjacentElement('beforebegin', docEl);
						el.remove();
						resolve();
					});
			});
		}

		for (let el of containerEl.content.querySelectorAll('template')) {
			await replaceFileTags_(el);
		}
	}

	// #build
	async function build_() {
		if (_isDevelopment) {
			let docEl = $('._appTemplate');

			// replace template file
			await replaceFileTags_(docEl);

			// replace includables
			{
				// assume includables are always first level template
				// 1. replace includables inside template tags
				let topLevel = docEl;
				for (let templateTag of docEl.content.querySelectorAll('template')) {
					replaceIncludables(topLevel, templateTag);
				}

				// 2. replace includables in top level
				replaceIncludables(topLevel, topLevel);
			}

			let content = docEl.content;
			devTemplate = content;

			downloadableTemplate = docEl.innerHTML;

			fillWidgets();
			$('._app').replaceChildren(content);
		} else {
			let content = $('._appTemplate').content.cloneNode(true);

			$('._appTemplate').remove();

			devTemplate = content.querySelector('.widget-content');

			fillWidgets();
			$('._app').replaceChildren(...devTemplate.childNodes);
		}

		// release from memory
		if (!_isDevelopment) {
			widgets.length = 0;
		}
	}

	function replaceIncludables(topLevel, parentNode) {
		for (let includeTag of parentNode.content.querySelectorAll('b-include')) {
			let target = includeTag.getAttribute('template');
			let templateTag = topLevel.content.querySelector(`template#${target}`);

			// replace include tags inside templates
			// replaceIncludables(docEl, templateTag);

			includeTag.parentNode.insertBefore(templateTag.content.cloneNode(true), includeTag);
			includeTag.remove();
			templateTag.remove();
		}
	}

	function getWidgetType(text) {
		const match = text.match(/^([A-Za-z]+)/);
		const result = match ? match[1] : null;
		return result;
	}

	// #condition
	function removeConditionalWidgets(container = devTemplate, data = {}) {
		let nodes = container.querySelectorAll('[b-if]');

		for (const node of nodes) {
			let key = node.getAttribute('b-if');
			let isInverse = false;

			if (key.startsWith('!')) {
				isInverse = true;
				key = key.slice(1);
			}

			let evalResult = false;
			let dataKey = data[key];

			if (dataKey && dataMap[dataKey]) {
				let dataVal = dataMap[dataKey];
				if (dataVal.getAttribute('type') == 'boolean') {
					evalResult = JSON.parse(dataVal.textContent);
				} else {
					evalResult = dataVal?.textContent?.trim().length > 0;
				}
			}

			let isCondMet = evalResult;

			if (isInverse) {
				isCondMet = !evalResult;
			}

			if (!isCondMet) {
				node.remove();
			}

			node.removeAttribute('b-if');
		}
	}

	// this is the initial process of replacing custom template tags
	// tags: #fill
	function fillWidgets() {
		let globalData = widgets.find((e) => e.id == 'Global')?.data ?? {};
		_globalData = globalData;

		removeConditionalWidgets(devTemplate, _globalData);
		fillDataSlots(devTemplate, _globalData);
		processSection();
		processWidget();
	}

	function fillDataSlots(containerEl, data) {
		Object.entries(data).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				containerEl.querySelectorAll(`[b-data="${key}"]`).forEach((el) => {
					const docFrag = document.createDocumentFragment();
					const templateName = el.getAttribute('b-template');

					for (let v of value) {
						let includableData = v;
						const widgetBuilder = Object.create(widgetBase);

						widgetBuilder.data = Object.assign(includableData, _globalData, data);
						widgetBuilder.templateSelector = `#${templateName}`;

						const childNodes = widgetBuilder.build();

						docFrag.append(...childNodes.childNodes);
					}

					el.replaceChildren(docFrag);
					el.removeAttribute('b-data');
					el.removeAttribute('b-template');
				});
			} else {
				let mapValue = dataMap[value];

				// tags: #attributes

				containerEl.querySelectorAll(`[b-attr-href="${key}"]`).forEach((el) => {
					el.href = mapValue.textContent.trim();
					el.removeAttribute('b-attr-href');
				});
				containerEl.querySelectorAll(`[b-attr-src="${key}"]`).forEach((el) => {
					el.setAttribute('src', mapValue.textContent.trim());
					el.removeAttribute('b-attr-src');
				});
				containerEl.querySelectorAll(`[b-data="${key}"]`).forEach((el) => {
					el.replaceChildren(...mapValue.cloneNode(true).childNodes);
					el.removeAttribute('b-data');
				});
			}
		});
	}

	// tags: #section
	function processSection() {
		let nodes = devTemplate.querySelectorAll('b-section');

		for (let node of nodes) {
			let sectionId = node.getAttribute('id');
			let sectionContainer = dataDoc.querySelector(`.section#${sectionId}`);

			if (!sectionContainer) {
				continue;
			}

			let sectionNode = sectionContainer.cloneNode(true);
			let widgetNodes = sectionNode.querySelectorAll('& > .widget');

			widgetNodes.forEach((widgetNode) => {
				let instanceId = widgetNode.id;
				let widgetType = getWidgetType(instanceId);
				let templateNode = devTemplate.querySelector(`template#${widgetType}[b-section="${sectionId}"]`) || devTemplate.querySelector(`template#${widgetType}`);

				if (!templateNode) {
					return;
				}

				let widgetBuilder = Object.create(widgetBase);
				let widgetData = widgets.find((e) => e.id == instanceId);

				widgetBuilder.data = Object.assign(widgetData.data, _globalData);
				widgetBuilder.templateNode = templateNode;

				const childNode = widgetBuilder.build();

				node.parentNode.insertBefore(childNode, node)
			});

			node.remove()
		}
	}

	// #widgets
	function processWidget() {
		let nodes = devTemplate.querySelectorAll('b-widget');

		for (let node of nodes) {
			let widgetId = node.getAttribute('id');
			let widgetType = getWidgetType(widgetId);
			let templateId = node.getAttribute('template');
			let widgetData = widgets.find((e) => e.id == widgetId);
			let templateNode = devTemplate.querySelector(`template#${templateId}`) || devTemplate.querySelector(`template#${widgetType}:not([section])`);

			if (!templateNode) {
				console.log(`widget template not found for widget:`, widgetId);
				continue;
			}

			if (!widgetData) {
				console.log(`empty widget slot:`, widgetId);
				continue;
			}

			let widgetBuilder = Object.create(widgetBase);
			widgetBuilder.data = Object.assign(widgetData.data, _globalData);
			widgetBuilder.templateNode = templateNode;

			const childNode = widgetBuilder.build();

			node.parentNode.insertBefore(childNode, node);
			node.remove();
		}
	}

	// #self
	return {
		GetWidgetsData: () => widgets,

		DownloadTemplate() {
			let blob = new Blob([downloadableTemplate.trim()], { type: 'text/html' });
			let url = URL.createObjectURL(blob);

			let el = document.createElement('a');
			el.href = url;
			el.target = '_blank';
			el.download = location.pathname.split('/').pop();
			el.onclick = function () {
				el.remove();
			};
			document.body.append(el);
			el.click();
		},

		// tags: #copy
		CopyTemplate() {
			let node = document.createElement('textarea');
			node.value = downloadableTemplate.trim();
			document.body.append(node);
			node.select();
			node.setSelectionRange(0, node.value.length);
			document.execCommand("copy");
			node.remove();
			console.log('Copied to clipboard');
		},

		//  #init
		async init() {
			if (_isDevelopment) {
				let url = new URL(location.href);
				let fileName = options.fileName ?? url.pathname.split('/').pop();
				let pageDataUrl = [options.dataPath, fileName].join('/');
				let html = await fetch(pageDataUrl).then((response) => response.text());
				const parser = new DOMParser();
				const doc = parser.parseFromString(html, 'text/html');
				dataDoc = doc;
			}

			loadData();

			if (_isDevelopment) {
				console.log('widgets in this page:', widgets);
			}

			await build_();

			// for use in application script
			window['isAppReady'] = true;
		},
	};
}
