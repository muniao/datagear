/*
 * Copyright 2018 datagear.tech. All Rights Reserved.
 */

/**
 * 图表工厂，用于初始化图表对象，为图表对象添加功能函数。
 * 全局变量名：window.chartFactory
 * 
 * 加载时依赖：
 *   无
 * 
 * 运行时依赖:
 *   jquery.js
 *   echarts.js
 * 
 * 
 * 此图表工厂支持为<body>元素、<div>图表元素添加"dg-chart-options"属性来设置图表选项，格式为：
 * { title: { show: false },... }
 * 
 * 此图表工厂支持为<body>元素、<div>图表元素添加"dg-chart-theme"属性来设置图表主题，格式为：
 * { color:'...', backgroundColor:'...', ... }
 * 
 * 此图表工厂支持为<body>元素、<div>图表元素添加"dg-chart-listener"属性来设置图表监听器，格式参考chartBase.listener函数参数说明。
 * 
 * 此图表工厂支持为<div>图表元素添加"dg-chart-map"属性来设置地图图表的地图名。
 * 
 * 此图表工厂支持为<body>元素、<div>图表元素添加"dg-echarts-theme"属性来设置图表Echarts主题名。
 * 
 * 此图表工厂和dashboardFactory.js一起可以支持异步图表插件，示例如下：
 * {
 *   //声明render函数是否为异步，默认为false
 *   asyncRender: true || false || function(chart){ return true || false },
 *   
 *   render: function(chart)
 *   {
 *     $.get("...", function()
 *     {
 *       ...;
 *       
 *       //将图表状态设置为已完成render
 *       chart.statusRendered(true);
 *     });
 *   },
 *   
 *   //声明update函数是否为异步，默认为false
 *   asyncUpdate: true || false || function(chart, results){ return true || false },
 *   
 *   update: function(chart, results)
 *   {
 *     $.get("...", function()
 *     {
 *       ...;
 *       
 *       //将图表状态设置为已完成update
 *       chart.statusUpdated(true);
 *     });
 *   }
 * }
 */
(function(global)
{
	var chartFactory = (global.chartFactory || (global.chartFactory = {}));
	var chartBase = (chartFactory.chartBase || (chartFactory.chartBase = {}));
	
	/**
	 * echarts地图名称及其JSON地址映射表，如果页面有地图图表，应该设置这个对象。
	 * 例如：{"china" : "/map/china.json", "beijing" : "map/beijing.json", , "shanghai" : "../map/shanghai.json"}
	 * 此对象也可以定义一个名为"mapURL"的函数属性，用于获取没有名称对应的地址，格式为：function(name){ return "..."; }
	 * 具体参考下面的chartBase.echartsMapURL函数
	 */
	if(!chartFactory.echartsMapURLs)
		chartFactory.echartsMapURLs = {};
	
	/**
	 * 图表使用的渲染上下文属性名。
	 */
	chartFactory.renderContextAttrs =
	{
		//必须，图表主题，org.datagear.analysis.ChartTheme
		chartTheme: "chartTheme",
		//必须，Web上下文，org.datagear.analysis.support.html.HtmlTplDashboardRenderAttr.WebContext
		webContext: "webContext"
	};
	
	/**
	 * 初始化指定图表对象。
	 * 初始化前应确保chart.renderContext中包含chartFactory.renderContextAttrs必须的属性值。
	 * 
	 * @param chart 图表对象
	 */
	chartFactory.init = function(chart)
	{
		$.extend(chart, this.chartBase);
		chart.init();
	};
	
	/**
	 * 获取/设置渲染上下文的属性值。
	 * 
	 * @param renderContext
	 * @param attrName
	 * @param attrValue 要设置的属性值，可选，不设置则执行获取操作
	 */
	chartFactory.renderContextAttr = function(renderContext, attrName, attrValue)
	{
		if(attrValue === undefined)
			return renderContext.attributes[attrName];
		else
			return renderContext.attributes[attrName] = attrValue;
	};
	
	/**
	 * 判断指定HTML元素是否是图表组件。
	 * 
	 * @param element DOM元素、Jquery对象
	 */
	chartFactory.isChartElement = function(element)
	{
		return $(element).hasClass(chartFactory.CHART_DISTINCT_CSS_NAME);
	};
	
	/**图表状态：准备render*/
	chartFactory.STATUS_PRE_RENDER = "PRE_RENDER";
	
	/**图表状态：正在render*/
	chartFactory.STATUS_RENDERING = "RENDERING";
	
	/**图表状态：完成render*/
	chartFactory.STATUS_RENDERED = "RENDERED";
	
	/**图表状态：准备update*/
	chartFactory.STATUS_PRE_UPDATE = "PRE_UPDATE";
	
	/**图表状态：正在update*/
	chartFactory.STATUS_UPDATING = "UPDATING";
	
	/**图表状态：完成update*/
	chartFactory.STATUS_UPDATED = "UPDATED";
	
	/**图表状态：已销毁*/
	chartFactory.STATUS_DESTROYED = "DESTROYED";
	
	/**用于标识图表元素的CSS名*/
	chartFactory.CHART_DISTINCT_CSS_NAME = "dg-chart-for-distinction";
	
	//----------------------------------------
	// chartBase start
	//----------------------------------------
	
	/**
	 * 初始化图表。
	 */
	chartBase.init = function()
	{
		this.initListener();
		
		//最后才设置为可渲染状态
		this.statusPreRender(true);
	};
	
	/**
	 * 初始化图表监听器。
	 * 此方法依次从<div>图表元素、<body>元素的"dg-chart-listener"属性获取监听器对象。
	 */
	chartBase.initListener = function()
	{
		var $chart = this.elementJquery();
		
		var listenerStr = $chart.attr("dg-chart-listener");
		if(!listenerStr)
			listenerStr = $(document.body).attr("dg-chart-listener");
		
		if(listenerStr)
		{
			var listener = chartFactory.evalSilently(listenerStr);
			
			if(listener)
				this.listener(listener);
		}
	};
	
	/**
	 * 获取/设置图表监听器。
	 * 图表监听器格式为：
	 * {
	 *   //渲染图表完成回调函数
	 *   render: function(chart){ ... },
	 *   //更新图表数据完成回调函数
	 *   update: function(chart, results){ ... },
	 *   //可选，渲染图表前置回调函数，返回false将阻止渲染图表
	 *   onRender: function(chart){ ... },
	 *   //可选，更新图表数据前置回调函数，返回false将阻止更新图表数据
	 *   onUpdate: function(chart, results){ ... },
	 * }
	 * 
	 * @param listener 可选，要设置的监听器对象，没有则执行获取操作
	 */
	chartBase.listener = function(listener)
	{
		if(listener === undefined)
			return this._listener;
		else
			this._listener = listener;
	};
	
	/**
	 * 渲染图表。
	 * 注意：只有this.statusPreRender()为true，此方法才会执行。
	 */
	chartBase.render = function()
	{
		if(!this.statusPreRender())
			return false;
		
		var $chart = this.elementJquery();
		$chart.addClass(chartFactory.CHART_DISTINCT_CSS_NAME);
		chartFactory.setThemeStyle($chart, this.theme());
		
		this.statusRendering(true);
		
		var doRender = true;
		
		var listener = this.listener();
		if(listener && listener.onRender)
		  doRender = listener.onRender(this);
		
		if(doRender != false)
		{
			var async = this.isAsyncRender();
			
			this.plugin.chartRenderer.render(this);
			
			if(!async)
				this.statusRendered(true);
		}
	};
	
	/**
	 * 更新图表。
	 * 注意：只有this.statusRendered()或者this.statusPreUpdate()或者this.statusUpdated()为true，此方法才会执行。
	 * 
	 * @param results 图表数据集结果
	 */
	chartBase.update = function(results)
	{
		if(!this.statusRendered() && !this.statusPreUpdate() && !this.statusUpdated())
			return false;
		
		this.statusUpdating(true);
		
		var doUpdate = true;
		
		var listener = this.listener();
		if(listener && listener.onUpdate)
			doUpdate = listener.onUpdate(this, results);
		
		if(doUpdate != false)
		{
			this._updateResults = results;
			
			var async = this.isAsyncUpdate(results);
			this.plugin.chartRenderer.update(this, results);
			
			if(!async)
				this.statusUpdated(true);
		}
	};
	
	/**
	 * 获取用于此次更新图表的结果数据，没有则返回null。
	 */
	chartBase.getUpdateResults = function()
	{
		return this._updateResults;
	};
	
	/**
	 * 重新调整图表尺寸。
	 */
	chartBase.resize = function()
	{
		if(this.plugin.chartRenderer.resize)
			this.plugin.chartRenderer.resize(this);
		else
		{
			var echartsInstance = this.echartsInstance();
			if(echartsInstance)
				echartsInstance.resize();
		}
	};
	
	/**
	 * 销毁图表，释放图表占用的资源、恢复图表HTML元素初值。
	 */
	chartBase.destroy = function()
	{
		this.statusDestroyed(true);
		this.elementJquery().removeClass(chartFactory.CHART_DISTINCT_CSS_NAME);
		
		if(this.plugin.chartRenderer.destroy)
			this.plugin.chartRenderer.destroy(this);
		else
		{
			var echartsInstance = this.echartsInstance();
			if(echartsInstance && !echartsInstance.isDisposed())
			{
				echartsInstance.dispose();
				this.echartsInstance(null);
			}
			
			this.elementJquery().empty();
		}
	};
	
	/**
	 * 图表的render方法是否是异步的。
	 */
	chartBase.isAsyncRender = function()
	{
		var chartRenderer = this.plugin.chartRenderer;
		
		if(chartRenderer.asyncRender == undefined)
			return false;
		
		if(typeof(chartRenderer.asyncRender) == "function")
			return chartRenderer.asyncRender(this);
		
		return (chartRenderer.asyncRender == true);
	};
	
	/**
	 * 图表的update方法是否是异步的。
	 * 
	 * @param results 图表数据集结果
	 */
	chartBase.isAsyncUpdate = function(results)
	{
		var chartRenderer = this.plugin.chartRenderer;
		
		if(chartRenderer.asyncUpdate == undefined)
			return false;
		
		if(typeof(chartRenderer.asyncUpdate) == "function")
			return chartRenderer.asyncUpdate(this, results);
		
		return (chartRenderer.asyncUpdate == true);
	};
	
	/**
	 * 图表是否为/设置为：准备render。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusPreRender = function(set)
	{
		if(set)
			this.status(chartFactory.STATUS_PRE_RENDER);
		else
			return (this.status() == chartFactory.STATUS_PRE_RENDER);
	};
	
	/**
	 * 图表是否为/设置为：正在render。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusRendering = function(set)
	{
		if(set)
			this.status(chartFactory.STATUS_RENDERING);
		else
			return (this.status() == chartFactory.STATUS_RENDERING);
	};
	
	/**
	 * 图表是否为/设置为：完成render。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 * @param callListener 可选，当set为true时，是否调用图表监听器的render回调函数，默认为true
	 */
	chartBase.statusRendered = function(set, callListener)
	{
		if(set)
		{
			this.status(chartFactory.STATUS_RENDERED);
			
			if(callListener != false)
			{
				var listener = this.listener();
				if(listener && listener.render)
				  listener.render(this);
			}
		}
		else
			return (this.status() == chartFactory.STATUS_RENDERED);
	};
	
	/**
	 * 图表是否为/设置为：准备update。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusPreUpdate = function(set)
	{
		if(set)
			this.status(chartFactory.STATUS_PRE_UPDATE);
		else
			return (this.status() == chartFactory.STATUS_PRE_UPDATE);
	};
	
	/**
	 * 图表是否为/设置为：正在update。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusUpdating = function(set)
	{
		if(set)
			this.status(chartFactory.STATUS_UPDATING);
		else
			return (this.status() == chartFactory.STATUS_UPDATING);
	};
	
	/**
	 * 图表是否为/设置为：完成update。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 * @param callListener 可选，当set为true时，是否调用图表监听器的update回调函数，默认为true
	 */
	chartBase.statusUpdated = function(set, callListener)
	{
		if(set)
		{
			this.status(chartFactory.STATUS_UPDATED);
			
			if(callListener != false)
			{
				var listener = this.listener();
				if(listener && listener.update)
				  listener.update(this, this.getUpdateResults());
			}
		}
		else
			return (this.status() == chartFactory.STATUS_UPDATED);
	};
	
	/**
	 * 图表是否为/设置为：已销毁。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusDestroyed = function(set)
	{
		if(set)
			this.status(chartFactory.STATUS_DESTROYED);
		else
			return (this.status() == chartFactory.STATUS_DESTROYED);
	};
	
	/**
	 * 获取/设置图表状态。
	 * 
	 * @param status 可选，要设置的状态，不设置则执行获取操作
	 */
	chartBase.status = function(status)
	{
		if(status === undefined)
			return this._status;
		else
			this._status = status;
	};
	
	/**
	 * 绑定"click"事件处理函数。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onClick = function(handler)
	{
		this.on("click", handler);
	};
	
	/**
	 * 绑定"dblclick"事件处理函数。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onDblclick = function(handler)
	{
		this.on("dblclick", handler);
	};
	
	/**
	 * 绑定"mousedown"事件处理函数。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMousedown = function(handler)
	{
		this.on("mousedown", handler);
	};
	
	/**
	 * 绑定"mouseup"事件处理函数。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMouseup = function(handler)
	{
		this.on("mouseup", handler);
	};
	
	/**
	 * 绑定"mouseover"事件处理函数。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMouseover = function(handler)
	{
		this.on("mouseover", handler);
	};
	
	/**
	 * 绑定"mouseout"事件处理函数。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMouseout = function(handler)
	{
		this.on("mouseout", handler);
	};
	
	/**
	 * 绑定事件处理函数。
	 * 
	 * @param eventType 事件类型：click、dblclick、mousedown、mouseup、mouseover、mouseout
	 * @param handler 事件处理函数：function(chartEvent){ ... }
	 */
	chartBase.on = function(eventType, handler)
	{
		if(this.plugin.chartRenderer.on)
			this.plugin.chartRenderer.on(this, eventType, handler);
		else
			throw new Error("Chart plugin ["+this.plugin.id+"] 's [chartRenderer.on] undefined");
	};
	
	/**
	 * 解绑事件处理函数。
	 * 
	 * @param eventType 事件类型：click、dblclick、mousedown、mouseup、mouseover、mouseout
	 * @param handler 可选，解绑的事件处理函数，不设置则解绑所有此事件类型的处理函数
	 */
	chartBase.off = function(eventType, handler)
	{
		if(this.plugin.chartRenderer.off)
			this.plugin.chartRenderer.off(this, eventType, handler);
		else
			throw new Error("Chart plugin ["+this.plugin.id+"] 's [chartRenderer.off] undefined");
	};
	
	/**
	 * 此图表是否有带参数的数据集。
	 */
	chartBase.hasDataSetParam = function()
	{
		var re = false;
		
		var chartDataSets = this.chartDataSetsNonNull();
		for(var i=0; i<chartDataSets.length; i++)
		{
			var params = chartDataSets[i].dataSet.params;
			re = (params && params.length > 0);
			
			if(re)
				break;
		}
		
		return re;
	};
	
	/**
	 * 图表的所有/指定数据集参数值是否齐备。
	 * 
	 * @param chartDataSet 指定图表数据集或其索引，如果不设置，则取所有
	 */
	chartBase.isDataSetParamValueReady = function(chartDataSet)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		var chartDataSets = (chartDataSet ? [ chartDataSet ] : this.chartDataSetsNonNull());
		
		for(var i=0; i<chartDataSets.length; i++)
		{
			var dataSet = chartDataSets[i].dataSet;
			
			if(!dataSet.params || dataSet.params.length == 0)
				continue;
			
			var paramValues = (chartDataSets[i].paramValues || {});
			
			for(var j=0; j<dataSet.params.length; j++)
			{
				var dsp = dataSet.params[j];
				
				if((dsp.required+"") == "true" && paramValues[dsp.name] == null)
					return false;
			}
		}
		
		return true;
	};
	
	/**
	 * 获取/设置指定数据集单个参数值。
	 * 
	 * @param chartDataSet 指定图表数据集或其索引
	 * @param name 参数名
	 * @param value 要设置的参数值，不设置则执行获取操作
	 */
	chartBase.dataSetParamValue = function(chartDataSet, name, value)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		if(chartDataSet.paramValues == null)
			chartDataSet.paramValues = {};
		
		if(chartDataSet._originalParamValues == null)
			chartDataSet._originalParamValues = $.extend({}, chartDataSet.paramValues);
		
		if(value == undefined)
			return chartDataSet.paramValues[name];
		else
			chartDataSet.paramValues[name] = value;
	};
	
	/**
	 * 获取/设置指定数据集参数值集。
	 * 
	 * @param chartDataSet 指定图表数据集或其索引
	 * @param paramValuesObj 要设置的参数值集对象，不设置则执行获取操作
	 */
	chartBase.dataSetParamValues = function(chartDataSet, paramValuesObj)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		if(chartDataSet.paramValues == null)
			chartDataSet.paramValues = {};
		
		if(chartDataSet._originalParamValues == null)
			chartDataSet._originalParamValues = $.extend({}, chartDataSet.paramValues);
		
		if(paramValuesObj == undefined)
			return chartDataSet.paramValues;
		else
			chartDataSet.paramValues = paramValuesObj;
	};
	
	/**
	 * 已弃用，请使用dataSetParamValues函数。
	 */
	chartBase.getDataSetParamValues = function(chartDataSet)
	{
		return this.dataSetParamValues(chartDataSet);
	};
	
	/**
	 * 已弃用，请使用dataSetParamValues函数。
	 */
	chartBase.setDataSetParamValues = function(chartDataSet, paramValuesObj)
	{
		this.dataSetParamValues(chartDataSet, paramValuesObj);
	};
	
	/**
	 * 重置指定数据集参数值集。
	 * 
	 * @param chartDataSet 指定图表数据集或其索引
	 */
	chartBase.resetDataSetParamValues = function(chartDataSet)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		if(chartDataSet._originalParamValues == null)
			return;
		
		chartDataSet.paramValues = $.extend({}, chartDataSet._originalParamValues);
	};
	
	/**
	 * 获取图表的DOM元素。
	 */
	chartBase.element = function()
	{
		return document.getElementById(this.elementId);
	};
	
	/**
	 * 获取图表的DOM元素的Jquery对象。
	 */
	chartBase.elementJquery = function()
	{
		return $("#" + this.elementId);
	};
	
	/**
	 * 获取图表名称。
	 */
	chartBase.nameNonNull = function()
	{
		return (this.name || "");
	};
	
	/**
	 * 获取图表的更新间隔。
	 */
	chartBase.updateIntervalNonNull = function()
	{
		if(this.updateInterval != null)
			return this.updateInterval;
		
		return -1;
	},

	/**
	 * 获取图表设置项。
	 * 它读取图表DOM元素和body元素上的"dg-chart-options"属性定义的图表设置项。
	 * 
	 * @param options 初始设置项，可选，默认为：{}
	 * @return {...}
	 */
	chartBase.options = function(options)
	{
		options = (options || {});
		
		var $ele = this.elementJquery();
		
		var optsStrGlobal = ($(document.body).attr("dg-chart-options") || "");
		var optsStr = ($ele.attr("dg-chart-options") || "");
		
		if(optsStrGlobal)
			options = $.extend(true, options, chartFactory.evalSilently(optsStrGlobal, {}));
		
		if(optsStr)
			options = $.extend(true, options, chartFactory.evalSilently(optsStr, {}));
		
		this._prevReadOptionsGlobal = optsStrGlobal;
		this._prevReadOptions = optsStr;
		
		return options;
	};
	
	/**
	 * 获取更改的图表设置项。
	 * 它检查图表DOM元素和body元素上的"dg-chart-options"属性值，如果有更改，才读取，否则，返回空对象{}或者options。
	 * 
	 * @param options 初始设置项，可选，默认为：{}
	 * @return {...}
	 */
	chartBase.optionsModified = function(options)
	{
		options = (options || {});
		
		var $ele = this.elementJquery();
		
		var optsStrGlobal = ($(document.body).attr("dg-chart-options") || "");
		var optsStr = ($ele.attr("dg-chart-options") || "");
		
		if(this._prevReadOptionsGlobal != optsStrGlobal)
		{
			if(optsStrGlobal)
				options = $.extend(true, options, chartFactory.evalSilently(optsStrGlobal, {}));
			this._prevReadOptionsGlobal = optsStrGlobal;
		}
		
		if(this._prevReadOptions != optsStr)
		{
			if(optsStr)
				options = $.extend(true, options, chartFactory.evalSilently(optsStr, {}));
			this._prevReadOptions = optsStr;
		}
		
		return options;
	};
	
	/**
	 * 获取图表主题。
	 * 它会读取body元素、图表div元素上的"dg-chart-theme"属性值作为自定义主题。
	 * 
	 * @return {...}
	 */
	chartBase.theme = function()
	{
		var chartTheme = this._chartTheme;
		
		if(chartTheme)
			return chartTheme;
		
		chartTheme = chartFactory._GLOBAL_CHART_THEME;
		
		if(!chartTheme)
		{
			chartTheme = this.renderContextAttr(chartFactory.renderContextAttrs.chartTheme);
			
			var bodyThemeValue = $(document.body).attr("dg-chart-theme");
			if(bodyThemeValue)
			{
				var bodyThemeObj = chartFactory.evalSilently(bodyThemeValue, {});
				
				//兼容1.5.0版本的自定义ChartTheme结构，未来版本会移除
				if(bodyThemeObj.colorSecond)
				{
					bodyThemeObj.color = bodyThemeObj.colorSecond;
					bodyThemeObj.titleColor = bodyThemeObj.color;
					bodyThemeObj.legendColor = bodyThemeObj.colorSecond;
				}
				
				//允许自定义ChartTheme不设置actualBackgroundColor
				if(!bodyThemeObj.actualBackgroundColor && bodyThemeObj.backgroundColor != "transparent")
					bodyThemeObj.actualBackgroundColor = bodyThemeObj.backgroundColor;
				
				chartTheme = $.extend(true, {}, chartTheme, bodyThemeObj);
			}
			
			chartFactory._GLOBAL_CHART_THEME = chartTheme;
		}
		
		var eleThemeValue = this.elementJquery().attr("dg-chart-theme");
		
		if(eleThemeValue)
		{
			var eleThemeObj = chartFactory.evalSilently(eleThemeValue, {});
			
			//允许自定义ChartTheme不设置actualBackgroundColor
			if(!eleThemeObj.actualBackgroundColor && eleThemeObj.backgroundColor != "transparent")
				eleThemeObj.actualBackgroundColor = eleThemeObj.backgroundColor;
			
			chartTheme = $.extend(true, {}, chartTheme, eleThemeObj);
		}
		
		this._chartTheme = chartTheme;
		
		return chartTheme;
	};
	
	/**
	 * 获取/设置图表元素上的"dg-chart-map"属性值。
	 * 
	 * @param value 设置操作时的值
	 */
	chartBase.map = function(value)
	{
		if(value === undefined)
			return this.elementJquery().attr("dg-chart-map");
		else
			this.elementJquery().attr("dg-chart-map", value);
	};
	
	/**
	 * 获取/设置图表渲染上下文的属性值。
	 * 
	 * @param attrName
	 * @param attrValue 要设置的属性值，可选，不设置则执行获取操作
	 */
	chartBase.renderContextAttr = function(attrName, attrValue)
	{
		return chartFactory.renderContextAttr(this.renderContext, attrName, attrValue);
	};
	
	/**
	 * 获取/设置扩展值。
	 * 图表插件渲染器可以用此函数在render()、update()间传递数据，避免与图表本身的属性命名冲突。
	 * 
	 * @param name 扩展名
	 * @param value 要设置的扩展值，可选，不设置则执行获取操作
	 */
	chartBase.extValue = function(name, value)
	{
		if(value === undefined)
			return (this._extValues ? this._extValues[name] : undefined);
		else
		{
			if(!this._extValues)
				this._extValues = {};
			this._extValues[name] = value;
		}
	};
	
	/**
	 * 获取图表数据集对象数组。
	 */
	chartBase.chartDataSetsNonNull = function()
	{
		return (this.chartDataSets || []);
	};
	
	/**
	 * 获取第一个图表数据集对象。
	 * 
	 * @param chart
	 * @return {...} 或  undefined
	 */
	chartBase.chartDataSetFirst = function()
	{
		return this.chartDataSetAt(0);
	};
	
	/**
	 * 获取指定索引的图表数据集对象，没有则返回undefined。
	 * 
	 * @param index
	 */
	chartBase.chartDataSetAt = function(index)
	{
		return (!this.chartDataSets || this.chartDataSets.length <= index ? undefined : this.chartDataSets[index]);
	};
	
	/**
	 * 获取指定图表数据集的名称，它不会返回null。
	 * 
	 * @param chartDataSet 图表数据集对象
	 */
	chartBase.dataSetName = function(chartDataSet)
	{
		if(!chartDataSet)
			return "";
		
		if(chartDataSet.alias)
			return chartDataSet.alias;
		
		var dataSet = (chartDataSet.dataSet || chartDataSet);
		
		return (dataSet ? (dataSet.name || "") : "");
	};
	
	/**
	 * 获取指定标记的第一个数据集属性，没有则返回undefined。
	 * 
	 * @param chartDataSet 图表数据集对象
	 * @param dataSign 数据标记对象、标记名称
	 * @return {...}
	 */
	chartBase.dataSetPropertyOfSign = function(chartDataSet, dataSign)
	{
		var properties = this.dataSetPropertiesOfSign(chartDataSet, dataSign);
		
		return (properties.length > 0 ? properties[0] : undefined);
	};
	
	/**
	 * 获取指定标记的数据集属性数组。
	 * 
	 * @param chartDataSet 图表数据集对象
	 * @param dataSign 数据标记对象、标记名称
	 * @return [...]
	 */
	chartBase.dataSetPropertiesOfSign = function(chartDataSet, dataSign)
	{
		var re = [];
		
		if(!chartDataSet || !chartDataSet.dataSet || !dataSign)
			return re;
		
		dataSign = (dataSign.name || dataSign);
		var dataSetProperties = (chartDataSet.dataSet.properties || []);
		var propertySigns = (chartDataSet.propertySigns || {});
		
		var signPropertyNames = [];
		
		for(var pname in propertySigns)
		{
			var mySigns = (propertySigns[pname] || []);
			
			for(var i=0; i<mySigns.length; i++)
			{
				if(mySigns[i] == dataSign || mySigns[i].name == dataSign)
				{
					signPropertyNames.push(pname);
					break;
				}
			}
		}
		
		for(var i=0; i<dataSetProperties.length; i++)
		{
			for(var j=0; j<signPropertyNames.length; j++)
			{
				if(dataSetProperties[i].name == signPropertyNames[j])
					re.push(dataSetProperties[i]);
			}
		}
		
		return re;
	};
	
	/**
	 * 获取数据集属性标签，它不会返回null。
	 * 
	 * @param dataSetProperty
	 * @return "..."
	 */
	chartBase.dataSetPropertyLabel = function(dataSetProperty)
	{
		if(!dataSetProperty)
			return "";
		
		var label = (dataSetProperty.label ||  dataSetProperty.name);
		
		return (label || "");
	};

	/**
	 * 返回第一个数据集结果，没有则返回undefined。
	 * 
	 * @param results
	 */
	chartBase.resultFirst = function(results)
	{
		return this.resultAt(results, 0);
	};
	
	/**
	 * 返回指定索引的数据集结果，没有则返回undefined。
	 * 
	 * @param results
	 * @param index
	 */
	chartBase.resultAt = function(results, index)
	{
		return (!results || results.length <= index ? undefined : results[index]);
	};
	
	/**
	 * 获取数据集结果的行对象数组。
	 * @param result 数据集结果对象
	 */
	chartBase.resultDatas = function(result)
	{
		return (result && result.datas ? result.datas : []);
	};
	
	/**
	 * 获取数据集结果的行对象指定属性值。
	 * 
	 * @param rowObj 行对象
	 * @param property 属性对象、属性名
	 */
	chartBase.resultRowCell = function(rowObj, property)
	{
		if(!rowObj || !property)
			return undefined;
		
		var name = (property.name || property);
		return rowObj[name];
	};
	
	/**
	 * 将数据集结果的行对象按照指定properties顺序转换为行值数组。
	 * 
	 * @param result 数据集结果对象、对象数组
	 * @param properties 数据集属性对象数组、属性名数组、属性对象、属性名
	 * @param row 行索引，可选，默认为0
	 * @param count 获取的最多行数，可选，默认为全部
	 * @return properties为数组时：[[..., ...], ...]；properties非数组时：[..., ...]
	 */
	chartBase.resultRowArrays = function(result, properties, row, count)
	{
		var re = [];
		
		if(!result || !properties)
			return re;
		
		var datas = (result.length != undefined ? result : (result.datas || []));
		
		row = (row || 0);
		var getCount = datas.length;
		if(count != null && count < getCount)
			getCount = count;
		
		if(properties.length > 0)
		{
			for(var i=row; i< getCount; i++)
			{
				var rowObj = datas[i];
				var row = [];
				
				for(var j=0; j<properties.length; j++)
				{
					var p = properties[j];
					
					var name = (p ? (p.name || p) : undefined);
					if(!name)
						continue;
					
					row[j] = rowObj[name];
				}
				
				re.push(row);
			}
		}
		else
		{
			var name = (properties ? (properties.name || properties) : undefined);
			
			if(name)
			{
				for(var i=row; i< getCount; i++)
				{
					var rowObj = datas[i];
					re.push(rowObj[name]);
				}
			}
		}
		
		return re;
	};
	
	/**
	 * 将数据集结果的行对象按照指定properties顺序转换为列值数组。
	 * 
	 * @param result 数据集结果对象、对象数组
	 * @param properties 数据集属性对象数组、属性名数组、属性对象、属性名
	 * @param row 行索引，以0开始，可选，默认为0
	 * @param count 获取的最多行数，可选，默认为全部
	 * @return properties为数组时：[[..., ...], ...]；properties非数组时：[..., ...]
	 */
	chartBase.resultColumnArrays = function(result, properties, row, count)
	{
		var re = [];

		if(!result || !properties)
			return re;
		
		var datas = (result.length != undefined ? result : (result.datas || []));
		
		row = (row || 0);
		var getCount = datas.length;
		if(count != null && count < getCount)
			getCount = count;
		
		if(properties.length > 0)
		{
			for(var i=0; i<properties.length; i++)
			{
				var p = properties[i];
				
				var name = (p ? (p.name || p) : undefined);
				if(!name)
					continue;
				
				var column = [];
				
				for(var j=row; j< getCount; j++)
					column.push(datas[j][name]);
				
				re[i] = column;
			}
		}
		else
		{
			var name = (properties ? (properties.name || properties) : undefined);

			if(name)
			{
				for(var i=row; i< getCount; i++)
				{
					var rowObj = datas[i];
					re.push(rowObj[name]);
				}
			}
		}
		
		return re;
	};
	
	/**
	 * 获取数据集结果的名称/值对象数组。
	 * 
	 * @param result 数据集结果对象、对象数组
	 * @param nameProperty 名称属性对象、属性名
	 * @param valueProperty 值属性对象、属性名、数组
	 * @param row 行索引，以0开始，可选，默认为0
	 * @param count 获取结果数据的最多行数，可选，默认为全部
	 * @return [{name: ..., value: ...}, ...]
	 */
	chartBase.resultNameValueObjects = function(result, nameProperty, valueProperty, row, count)
	{
		var re = [];
		
		if(!result || !nameProperty || !valueProperty)
			return re;
		
		var datas = (result.length != undefined ? result : (result.datas || []));
		
		row = (row || 0);
		var getCount = datas.length;
		if(count != null && count < getCount)
			getCount = count;
		
		nameProperty = (nameProperty.name || nameProperty);
		
		if(valueProperty.length)
		{
			for(var i=row; i< getCount; i++)
			{
				var name = datas[i][nameProperty];
				var value = [];
				
				for(var j=0; j<valueProperty.length; j++)
				{
					var vn = (valueProperty[j].name || valueProperty[j]);
					value[j] = datas[i][vn];
				}
				
				re.push({ "name" : name, "value" : value });
			}
		}
		else
		{
			valueProperty = (valueProperty.name || valueProperty);
			
			for(var i=row; i< getCount; i++)
			{
				var obj =
				{
					"name" : datas[i][nameProperty],
					"value" : datas[i][valueProperty]
				};
				
				re.push(obj);
			}
		}
		
		return re;
	};
	
	/**
	 * 获取数据集结果指定属性、指定行的单元格值，没有则返回undefined。
	 * 
	 * @param result 数据集结果对象
	 * @param property 数据集属性对象、属性名
	 * @param row 行索引，可选，默认为0
	 */
	chartBase.resultCell = function(result, property, row)
	{
		row = (row || 0);
		
		var re = this.resultRowArrays(result, property, row, 1);
		
		return (re.length > 0 ? re[0] : undefined);
	};
	
	/**
	 * 初始化Echarts对象。
	 * 
	 * @param options echarts设置项
	 * @param customized 是否为options扩展自定义设置项，可选，默认为true
	 * @return echarts实例对象
	 */
	chartBase.echartsInit = function(options, customized)
	{
		if(customized != false)
			options = this.options(options);
		
		var instance = echarts.init(this.element(), this.echartsThemeName());
		instance.setOption(options);
		
		this.echartsInstance(instance);
		
		return instance;
	};
	
	/**
	 * 获取/设置echarts实例对象。
	 * 
	 * @param instance 要设置的echarts实例
	 */
	chartBase.echartsInstance = function(instance)
	{
		if(instance === undefined)
			return this._echartsInstance;
		else
			this._echartsInstance = instance;
	};
	
	/**
	 * 设置echarts实例的选项值。
	 * 
	 * @param options
	 * @param checkModified 是否检查并合并元素上的配置项变更，默认为true
	 */
	chartBase.echartsOptions = function(options, checkModified)
	{
		if(checkModified != false)
			options = this.optionsModified(options);
		
		var instance = this.echartsInstance();
		instance.setOption(options);
	};
	
	/**
	 * 获取图表的echarts主题名。
	 * 它读取body元素、图表div元素上的"dg-echarts-theme"属性值，作为当前echarts主题名。
	 */
	chartBase.echartsThemeName = function()
	{
		var themeName = this._echartsThemeName;
		
		if(themeName)
			return themeName;
		
		themeName = this.elementJquery().attr("dg-echarts-theme");
		
		if(!themeName)
			themeName = $(document.body).attr("dg-echarts-theme");
		
		//无自定义echarts主题，则从ChartTheme构建
		if(!themeName)
		{
			var chartTheme = this.theme();
			
			//全局Echarts主题
			if(chartTheme === chartFactory._GLOBAL_CHART_THEME)
			{
				themeName = "globalThemeFromChartTheme";
				
				if(!chartFactory._GLOBAL_ECHARTS_THEME_REGISTERED)
				{
					var globalEchartsTheme = this.echartsBuildTheme(chartTheme);
					echarts.registerTheme(themeName, globalEchartsTheme);
					chartFactory._GLOBAL_ECHARTS_THEME_REGISTERED = true;
				}
			}
			//图表级Echarts主题
			else
			{
				themeName = this.elementId+"ThemeFromChartTheme";
				
				if(!this._echartsThemeRegistered)
				{
					var localEchartsTheme = this.echartsBuildTheme(chartTheme);
					echarts.registerTheme(themeName, localEchartsTheme);
					this._echartsThemeRegistered = true;
				}
			}
		}
		
		this._echartsThemeName = themeName;
	    
	    return themeName;
	};
	
	/**
	 * 指定名称的echarts地图是否已经注册过而无需再加载。
	 * 
	 * @param name echarts地图名称
	 */
	chartBase.echartsMapRegistered = function(name)
	{
		return (echarts.getMap(name) != null);
	};
	
	/**
	 * 获取echarts指定名称的地图JSON地址，如果找不到，则直接将name作为地址返回。
	 * 
	 * @param name echarts地图名称
	 */
	chartBase.echartsMapURL = function(name)
	{
		var url = chartFactory.echartsMapURLs[name];
		
		if(!url && typeof(chartFactory.echartsMapURLs.mapURL) == "function")
			url = chartFactory.echartsMapURLs.mapURL(name);
		
		url = (url || name);
		
		var contextPath = this.renderContextAttr(chartFactory.renderContextAttrs.webContext).contextPath;
		
		if(contextPath && url.indexOf("/") == 0 && url.indexOf(contextPath) != 0)
			url = contextPath + url;
		
		return url;
	};
	
	/**
	 * 加载指定名称的echarts地图JSON，并在完成后执行回调函数。
	 * 注意：如果地图图表插件的render/update函数中调用此函数，应该首先设置插件的asyncRender/asyncUpdate，
	 * 并在callback中调用chart.statusPreUpdate()/chart.statusUpdated()，具体参考此文件顶部的注释。
	 * 
	 * @param name echarts地图名称
	 * @param callback 完成回调函数：function(){ ... }
	 */
	chartBase.echartsMapLoad = function(name, callback)
	{
		var url = this.echartsMapURL(name);
		$.getJSON(url, function(geoJson)
		{
			echarts.registerMap(name, geoJson);
			
			if(callback)
				callback();
		});
	};

	/**
	 * 构建echarts主题。
	 * 
	 * @param chartTheme 图表主题
	 */
	chartBase.echartsBuildTheme = function(chartTheme)
	{
		return chartFactory.buildEchartsTheme(chartTheme);
	};
	
	//----------------------------------------
	// chartBase end
	//----------------------------------------
	
	/**图表事件的图表类型：Echarts*/
	chartFactory.CHART_EVENT_CHART_TYPE_ECHARTS = "echarts";
	
	/**图表事件的图表类型：HTML*/
	chartFactory.CHART_EVENT_CHART_TYPE_HTML = "html";
	
	/**
	 * 创建Echarts图表的事件对象。
	 * 
	 * @param eventType 事件类型
	 * @param echartsEventParams echarts事件处理函数的参数对象
	 */
	chartFactory.newChartEventEcharts = function(eventType, echartsEventParams)
	{
		var event =
		{
			"type": eventType,
			"chartType": chartFactory.CHART_EVENT_CHART_TYPE_ECHARTS,
			"originalEvent": echartsEventParams
		};
		
		return event;
	};
	
	/**
	 * 创建HTML图表的事件对象。
	 * 
	 * @param eventType 事件类型
	 * @param htmlEvent HTML事件对象
	 */
	chartFactory.newChartEventHtml = function(eventType, htmlEvent)
	{
		var event =
		{
			"type": eventType,
			"chartType": chartFactory.CHART_EVENT_CHART_TYPE_HTML,
			"originalEvent": htmlEvent
		};
		
		return event;
	};
	
	/**
	 * 获取/设置图表事件对象的数据（chartEvent.data）。
	 * 
	 * @param chartEvent 图表事件对象
	 * @param data 可选
	 */
	chartFactory.chartEventData = function(chartEvent, data)
	{
		if(data === undefined)
			return chartEvent["data"];
		else
			chartEvent["data"] = data;
	};
	
	/**
	 * 获取/设置图表事件对象的原始数据（（chartEvent.originalData））。
	 * 
	 * @param chartEvent 图表事件对象
	 * @param originalData 可选
	 */
	chartFactory.chartEventOriginalData = function(chartEvent, originalData)
	{
		if(originalData === undefined)
			return chartEvent["originalData"];
		else
			chartEvent["originalData"] = originalData;
	};
	
	/**
	 * 获取/设置图表事件对象的原始图表数据集索引（（chartEvent.originalChartDataSetIndex））。
	 * 
	 * @param chartEvent 图表事件对象
	 * @param originalChartDataSetIndex 可选
	 */
	chartFactory.chartEventOriginalChartDataSetIndex = function(chartEvent, originalChartDataSetIndex)
	{
		if(originalChartDataSetIndex === undefined)
			return chartEvent["originalChartDataSetIndex"];
		else
			chartEvent["originalChartDataSetIndex"] = originalChartDataSetIndex;
	};
	
	/**
	 * 获取/设置图表事件对象的原始结果数据索引（（chartEvent.originalResultDataIndex））。
	 * 
	 * @param chartEvent 图表事件对象
	 * @param originalResultDataIndex 可选
	 */
	chartFactory.chartEventOriginalResultDataIndex = function(chartEvent, originalResultDataIndex)
	{
		if(originalResultDataIndex === undefined)
			return chartEvent["originalResultDataIndex"];
		else
			chartEvent["originalResultDataIndex"] = originalResultDataIndex;
	};
	
	/**
	 * 设置图表事件对象的数据原始信息属性值详细（（chartEvent.originalData））。
	 * 
	 * @param chartEvent 图表事件对象
	 * @param data 数据集结果数据
	 * @param chartDataSetIndex 图表数据集索引
	 * @param resultDataIndex 图表数据集结果索引
	 */
	chartFactory.chartEventOriginalDataDetail = function(chartEvent, data, chartDataSetIndex, resultDataIndex)
	{
		var originalData = 
		{
			"data": data,
			"chartDataSetIndex": chartDataSetIndex,
			"resultDataIndex": resultDataIndex
		};
		
		chartFactory.chartEventOriginalData(chartEvent, originalData);
	};
	
	/**
	 * 绑定图表事件处理函数代理。
	 * 图表事件处理通常内部组件处理函数代理（比如Echarts），并在代理函数中调用图表事件处理函数。
	 * 
	 * @param chart
	 * @param eventType
	 * @param eventHanlder 图表事件处理函数：function(chartEvent){ ... }
	 * @param eventHandlerDelegation 图表事件处理函数代理，负责构建chartEvent对象并调用eventHanlder
	 * @param delegationBinder 代理事件绑定器，格式为：{ bind: function(chart, eventType, eventHandlerDelegation){ ... } }
	 */
	chartFactory.bindChartEventHandlerDelegation = function(chart, eventType, eventHanlder,
			eventHandlerDelegation, delegationBinder)
	{
		var delegations = chart.extValue("eventHandlerDelegations");
		if(delegations == null)
		{
			delegations = [];
			chart.extValue("eventHandlerDelegations", delegations);
		}
		
		delegationBinder.bind(chart, eventType, eventHandlerDelegation);
		
		delegations.push({ eventType: eventType , eventHanlder: eventHanlder, eventHandlerDelegation: eventHandlerDelegation });
	};
	
	/**
	 * 为图表解绑事件处理函数代理。
	 * 
	 * @param chart
	 * @param eventType 事件类型
	 * @param eventHanlder 可选，要解绑的图表事件处理函数，不设置则解除所有指定事件类型的处理函数
	 * @param delegationUnbinder 代理事件解绑器，格式为：{ unbind: function(chart, eventType, eventHandlerDelegation){ ... } }
	 */
	chartFactory.unbindChartEventHandlerDelegation = function(chart, eventType, eventHanlder, delegationUnbinder)
	{
		if(delegationUnbinder == undefined)
		{
			delegationUnbinder = eventHanlder;
			eventHanlder = undefined;
		}
		
		var delegations = chart.extValue("eventHandlerDelegations");
		
		if(delegations == null)
			return;
		
		var unbindCount = 0;
		
		for(var i=0; i<delegations.length; i++)
		{
			var eh = delegations[i];
			var unbind = false;
			
			if(eventType == eh.eventType)
				unbind = (eventHanlder == undefined || (eh.eventHanlder == eventHanlder));
			
			if(unbind)
			{
				delegationUnbinder.unbind(chart, eventType, eh.eventHandlerDelegation);
				delegations[i] = null;
				unbindCount++;
			}
		}
		
		if(unbindCount > 0)
		{
			var delegationsTmp = [];
			for(var i=0; i<delegations.length; i++)
			{
				if(delegations[i] != null)
					delegationsTmp.push(delegations[i]);
			}
			
			chart.extValue("eventHandlerDelegations", delegationsTmp);
		}
	};
	
	/**
	 * 执行JS代码。
	 * 
	 * @param str JS代码
	 * @param defaultValue 默认返回值，可选，默认为：undefined
	 */
	chartFactory.evalSilently = function(str, defaultValue)
	{
		var re = undefined;
		
		try
		{
			re = Function("return ("+str+");")();
		}
		catch(e)
		{
			this.logException(e);
		}
		
		return (re || defaultValue);
	};
	
	/**
	 * 解析JSON。
	 * 如果参数不合法，将返回空对象：{}。
	 */
	chartFactory.parseJSONSilently = function(str)
	{
		if(!str)
			return {};
		
		try
		{
			if(typeof($) != "undefined" && $.parseJSON)
				return $.parseJSON(str);
			else
				return JSON.parse(str);
		}
		catch(e)
		{
			this.logException(e);
		}
		
		return {};
	};
	
	/**
	 * 将不符合JSON规范的字符串定义规范化：属性名添加双引号、或将属性名单引号替换为双引号。
	 */
	chartFactory.trimJSONString = function(str)
	{
		if(!str)
			return str;
		
		//替换单引号为双引号
		var str1 = "";
		for(var i=0; i<str.length;i++)
		{
			var c = str.charAt(i);
			
			if(c == '\\')
			{
				str1 += c;
				i = i+1;
				str1 += str.charAt(i);
			}
			else if(c == '\'')
				str1 += '"';
			else
				str1 += c;
		}
		
		str = str1;
		
		//属性名匹配表达式
		var reg = /([{,]\s*)([^\:\s]*)(\s*:)/g;
		
		return str.replace(reg, function(token, prefix, name, suffix)
		{
			var len = name.length;
			
			if(len > 1 && name.charAt(0) == '"' && name.charAt(len-1) == '"')
				return token;
			else if(len > 1 && name.charAt(0) == '\'' && name.charAt(len-1) == '\'')
			{
				name = '"' + name.substring(1, len-1) + '"';
				return prefix + name + suffix;
			}
			else
				return prefix + '"' + name + '"' + suffix;
		});
	};
	
	/**
	 * 为元素设置主题样式。
	 * 
	 * @param element HTML元素、Jquery对象
	 * @param theme 主题对象
	 */
	chartFactory.setThemeStyle = function(element, theme)
	{
		return this.setStyles(element, theme);
	};
	
	/**
	 * 为元素设置样式集。
	 * 
	 * @param element HTML元素、Jquery对象
	 * @param stylesObj 样式对象，格式为：{ color: "...", backgroundColor: "...", fontSize: "...", ...  }
	 * @return 旧样式集对象
	 */
	chartFactory.setStyles = function(element, stylesObj)
	{
		var olds = {};

		if(element.length > 0)
			element = element[0];
	
		if(stylesObj && element.style != undefined)
		{	
			for(var p in stylesObj)
			{
				olds[p] = element.style[p];
				element.style[p] = stylesObj[p];
			}
		}
		
		return olds;
	};
	
	/**
	 * 获取主题指定因子的渐变色。
	 * 
	 * @param theme
	 * @param factor 颜色因子，0-1之间
	 */
	chartFactory.getGradualColor = function(theme, factor)
	{
		var gcs = theme._GRADUAL_COLORS;
		
		if(!gcs || gcs.length == 0)
		{
			gcs = this.evalGradualColors(theme.actualBackgroundColor, theme.color, 20);
			theme._GRADUAL_COLORS = gcs;
		}
		
		var index = parseInt((gcs.length-1) * factor);
		
		if(index == 0 && factor > 0)
			index = 1;
		
		if(index == gcs.length - 1 && factor < 1)
			index == gcs.length - 2;
		
		return gcs[index];
	};
	
	/**
	 * 计算渐变颜色。
	 * 
	 * @param start 起始颜色
	 * @param end 终止颜色
	 * @param count 计算数目
	 * @param rgb true 返回"rgb(...)"格式；fasle 返回"#FFFFFF"格式，默认为false
	 */
	chartFactory.evalGradualColors = function(start, end, count, rgb)
	{
		var colors = [];
		
		start = this.parseColor(start);
		end = this.parseColor(end);
		
		for(var i=0; i<count; i++)
		{
			var color = {};
			
			color.r = parseInt(start.r + (end.r - start.r)/count*i);
			color.g = parseInt(start.g + (end.g - start.g)/count*i);
			color.b = parseInt(start.b + (end.b - start.b)/count*i);
			
			if(rgb)
				color = "rgb("+color.r+","+color.g+","+color.b+")";
			else
			{
				var r = new Number(color.r).toString(16);
				var g = new Number(color.g).toString(16);
				var b = new Number(color.b).toString(16);
				
				color = "#" + (r.length == 1 ? "0"+r : r)
							 + (g.length == 1 ? "0"+g : g)
							  + (b.length == 1 ? "0"+b : b);
			}
			
			colors.push(color);
		}
		
		return colors;
	};
	
	/**
	 * 解析颜色对象。
	 * 将颜色字符串解析为{r: number, g: number, b: number}格式的对象。
	 * 
	 * @param color 颜色字符串，格式为："#FFF"、"#FFFFFF"、"rgb(255,255,255)"
	 */
	chartFactory.parseColor = function(color)
	{
		var re = {r: 0, g: 0, b: 0};
		
		if(!color)
			return re;
		
		//是颜色名称，则通过元素css函数转换
		if((color.charAt(0) != '#') && (color.indexOf("(") < 0))
		{
			var $colorEle = $("#chartFactoryEleForConvertColor");
			if($colorEle.length == 0)
				$colorEle = $("<div id='chartFactoryEleForConvertColor' style='position:absolute;left:0;bottom:0;width:0;height:0;'></div>")
								.appendTo(document.body);
			
			$colorEle.css("color", color);
			color = $colorEle.css("color");
		}
		
		// #FFF、#FFFFFF
		if(color.charAt(0) == '#')
		{
			color = color.substring(1);
			
			if(color.length == 3)
				color = color + color;
			
			if(color.length >= 2)
				re.r = parseInt(color.substr(0, 2), 16);
			if(color.length >= 4)
				re.g = parseInt(color.substr(2, 2), 16);
			if(color.length >= 6)
				re.b = parseInt(color.substr(4, 2), 16);
		}
		// rgb()
		else
		{
			var si = color.indexOf("(");
			var ei = (si >= 0 ? color.indexOf(")", si+1) : -1);
			
			if(ei > si)
			{
				color = color.substring(si+1, ei).split(",");
				
				if(color.length >= 1)
					re.r = parseInt(color[0]);
				if(color.length >= 2)
					re.g = parseInt(color[1]);
				if(color.length >= 3)
					re.b = parseInt(color[2]);
			}
		}
		
		return re;
	};
	
	/**
	 * 记录异常日志。
	 * 
	 * @param exception 异常对象
	 */
	chartFactory.logException = function(exception)
	{
		if(typeof console != "undefined")
		{
			if(console.error)
				console.error(exception);
			else if(console.warn)
				console.warn(exception);
			else if(console.info)
				console.info(exception);
		}
	};
	
	/**
	 * 由图表主题构建echarts主题。
	 * 
	 * @param chartTheme 图表主题对象：org.datagear.analysis.ChartTheme
	 */
	chartFactory.buildEchartsTheme = function(chartTheme)
	{
		var axisColor = this.getGradualColor(chartTheme, 0.8);
		var axisScaleLineColor = this.getGradualColor(chartTheme, 0.6);
		var areaColor0 = this.getGradualColor(chartTheme, 0.15);
		var areaBorderColor0 = this.getGradualColor(chartTheme, 0.3);
		var areaColor1 = this.getGradualColor(chartTheme, 0.25);
		var areaBorderColor1 = this.getGradualColor(chartTheme, 0.5);
		var shadowColor = this.getGradualColor(chartTheme, 0.9);
		
		//兼容1.8.1版本有ChartTheme.axisColor的结构
		if(chartTheme.axisColor)
			axisColor = chartTheme.axisColor;
		//兼容1.8.1版本有ChartTheme.axisScaleLineColor的结构
		if(chartTheme.axisScaleLineColor)
			axisScaleLineColor = chartTheme.axisScaleLineColor;
		
		var theme =
		{
			"color" : chartTheme.graphColors,
			"backgroundColor" : chartTheme.backgroundColor,
			"textStyle" : {},
			"title" : {
		        "left" : "center",
				"textStyle" : {
					"color" : chartTheme.titleColor
				},
				"subtextStyle" : {
					"color" : chartTheme.titleColor
				}
			},
			"line" : {
				"itemStyle" : {
					"normal" : {
						"borderWidth" : 1
					}
				},
				"lineStyle" : {
					"normal" : {
						"width" : 2
					}
				},
				"symbolSize" : 4,
				"symbol" : "emptyCircle",
				"smooth" : false
			},
			"radar" : {
				"name" : { "textStyle" : { "color" : chartTheme.legendColor } },
				"axisLine" : { "lineStyle" : { "color" : areaBorderColor0 } },
				"splitLine" : { "lineStyle" : { "color" : areaBorderColor0 } },
				"splitArea" : { "areaStyle" : { "color" : [ areaColor0, chartTheme.backgroundColor ] } },
				"itemStyle" : {
					"borderWidth" : 1
				},
				"lineStyle" : {
					"width" : 2
				},
				"emphasis" :
				{
					"lineStyle" : {
						"width" : 4,
						"shadowBlur" : 5,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				},
				"symbolSize" : 6,
				"symbol" : "circle",
				"smooth" : false
			},
			"bar" : {
				"itemStyle" : {
					"barBorderWidth" : 0,
					"barBorderColor" : chartTheme.borderColor
				},
				"emphasis" : {
					"itemStyle" : {
						"barBorderWidth" : 0,
						"barBorderColor" : chartTheme.borderColor,
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
				        "shadowOffsetY" : 0
					}
				}
			},
			"pie" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor
				},
				"emphasis" :
				{
					"itemStyle":
					{
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"scatter" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor,
					"shadowBlur" : 3,
					"shadowColor" : shadowColor
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor,
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				}
			},
			"boxplot" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"parallel" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"sankey" : {
				"label":
				{
					"color": chartTheme.color
				},
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor
				},
				"lineStyle":
				{
					"color": areaColor1,
					"opacity": 1
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					},
					"lineStyle":
					{
						"color": areaColor1,
						"opacity": 0.6
					}
				}
			},
			"funnel" : {
				"label" : {
					"color" : chartTheme.color,
					"show": true,
	                "position": "inside"
	            },
				"itemStyle" : {
					"borderColor" : chartTheme.borderColor,
					"borderWidth" : 0
				},
				"emphasis" : {
					"label" : {
	                    "fontSize" : 20
	                },
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"gauge" : {
				"title" : { color : chartTheme.legendColor },
				"itemStyle" : {
					"borderColor" : chartTheme.borderColor,
					"borderWidth" : 0
				},
				"emphasis" : {
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"candlestick" : {
				"itemStyle" : {
					"color" : chartTheme.graphColors[0],
					"color0" : chartTheme.graphColors[1],
					"borderColor" : chartTheme.graphColors[0],
					"borderColor0" : chartTheme.graphColors[1],
					"borderWidth" : 1
				},
				"emphasis" : {
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				}
			},
			"tree":
			{
				"label":
				{
					"color": chartTheme.color
				},
				"lineStyle": { "color": areaBorderColor0 },
				"emphasis" :
				{
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				}
			},
			"treemap":
			{
				"itemStyle" :
				{
					"borderWidth": 0.5,
					"borderColor": chartTheme.backgroundColor
				},
				"emphasis" :
				{
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				},
				"breadcrumb":
				{
					"itemStyle":
					{
						"color": chartTheme.backgroundColor,
						"borderColor": chartTheme.borderColor,
						"shadowBlur": 0,
						"textStyle": { color: chartTheme.color }
					}
				}
			},
			"sunburst":
			{
				"itemStyle" :
				{
					"borderWidth" : 1,
					"borderColor" : chartTheme.backgroundColor
				},
				"emphasis" :
				{
					"itemStyle" :
					{
						"shadowBlur" : 10,
						"shadowColor" : shadowColor,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"graph" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor,
					"shadowBlur" : 2,
					"shadowColor" : shadowColor
				},
				"lineStyle" : {
                    "color": "source",
                    "curveness": 0.3
				},
				"label" : {
					"color" : chartTheme.color
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor,
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					},
					"lineStyle" : {
						"width": 4
					}
				}
			},
			"map" : {
				"roam" : true,
				"itemStyle" : {
					"areaColor" : areaColor1,
					"borderColor" : areaBorderColor1,
					"borderWidth" : 0.5
				},
				"label" : {
					"color" : chartTheme.color
				},
				"emphasis" :
				{
					"label":
					{
						"color" : chartTheme.highlightTheme.color
					},
					"itemStyle":
					{
						"areaColor" : chartTheme.highlightTheme.backgroundColor,
						"borderColor" : chartTheme.highlightTheme.borderColor,
						"borderWidth" : 1
					}
				}
			},
			"geo" : {
				"itemStyle" : {
					"areaColor" : areaColor1,
					"borderColor" : areaBorderColor1,
					"borderWidth" : 0.5
				},
				"label" : {
					"color" : chartTheme.color
				},
				"emphasis" :
				{
					"label":
					{
						"color" : chartTheme.highlightTheme.color
					},
					"itemStyle":
					{
						"areaColor" : chartTheme.highlightTheme.backgroundColor,
						"borderColor" : chartTheme.highlightTheme.borderColor,
						"borderWidth" : 1
					}
				}
			},
			"categoryAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"valueAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"logAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"timeAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"toolbox" : {
				"iconStyle" : {
					"normal" : {
						"borderColor" : chartTheme.borderColor
					},
					"emphasis" : {
						"borderColor" : axisColor
					}
				}
			},
			"grid":
			{
				"left": 30,
				"right": 46,
				"top": 80,
				"bottom": 20,
				"containLabel": true
			},
			"legend" : {
				"orient": "horizontal",
				"top": 25,
				"textStyle" : {
					"color" : chartTheme.legendColor
				},
				"inactiveColor" : axisScaleLineColor
			},
			"tooltip" : {
				"backgroundColor" : chartTheme.tooltipTheme.backgroundColor,
				"textStyle" : { color: chartTheme.tooltipTheme.color },
				"axisPointer" : {
					"lineStyle" : {
						"color" : axisColor,
						"width" : "1"
					},
					"crossStyle" : {
						"color" : axisColor,
						"width" : "1"
					}
				}
			},
			"timeline" : {
				"lineStyle" : {
					"color" : axisColor,
					"width" : 1
				},
				"itemStyle" : {
					"normal" : {
						"color" : chartTheme.color,
						"borderWidth" : 1
					},
					"emphasis" : {
						"color" : chartTheme.color
					}
				},
				"controlStyle" : {
					"normal" : {
						"color" : chartTheme.color,
						"borderColor" : chartTheme.borderColor,
						"borderWidth" : 0.5
					},
					"emphasis" : {
						"color" : chartTheme.color,
						"borderColor" : chartTheme.borderColor,
						"borderWidth" : 0.5
					}
				},
				"checkpointStyle" : {
					"color" : chartTheme.highlightTheme.backgroundColor,
					"borderColor" : chartTheme.highlightTheme.borderColor
				},
				"label" : {
					"normal" : {
						"textStyle" : {
							"color" : axisColor
						}
					},
					"emphasis" : {
						"textStyle" : {
							"color" : chartTheme.color
						}
					}
				}
			},
			"visualMap" : {
				"inRange" :
				{
					"color" : chartTheme.graphRangeColors
				},
				"backgroundColor" : "transparent",
				"textStyle" :
				{
					"color" : axisColor
				}
			},
			"dataZoom" : {
				"backgroundColor" : "transparent",
				"dataBackgroundColor" : axisScaleLineColor,
				"fillerColor" : axisScaleLineColor,
				"handleColor" : axisScaleLineColor,
				"handleSize" : "100%",
				"textStyle" : {
					"color" : axisColor
				}
			},
			"markPoint" : {
				"label" : {
					"normal" : {
						"textStyle" : {
							"color" : axisColor
						}
					},
					"emphasis" : {
						"textStyle" : {
							"color" : axisColor
						}
					}
				}
			}
		};
		
		return theme;
	};
})
(this);