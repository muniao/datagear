/*
 * Copyright (c) 2018 datagear.tech. All Rights Reserved.
 */

/**
 * 
 */
package org.datagear.management.domain;

import java.io.File;
import java.util.Date;
import java.util.List;

import org.datagear.analysis.DataSetProperty;
import org.datagear.analysis.support.ExcelDirectoryFileDataSet;

/**
 * {@linkplain ExcelDirectoryFileDataSet}实体。
 * 
 * @author datagear@163.com
 *
 */
public class ExcelDataSetEntity extends ExcelDirectoryFileDataSet implements DirectoryFileDataSetEntity
{
	private static final long serialVersionUID = 1L;

	/** 展示名 */
	private String displayName;

	/** 创建用户 */
	private User createUser;

	/** 创建时间 */
	private Date createTime;

	/** 权限 */
	private int dataPermission = PERMISSION_NOT_LOADED;

	public ExcelDataSetEntity()
	{
		super();
		this.createTime = new Date();
	}

	public ExcelDataSetEntity(String id, String name, List<DataSetProperty> properties, File directory, String fileName,
			String displayName, User createUser)
	{
		super(id, name, properties, directory, fileName);
		this.displayName = displayName;
		this.createTime = new Date();
		this.createUser = createUser;
	}

	@Override
	public String getDisplayName()
	{
		return displayName;
	}

	@Override
	public void setDisplayName(String displayName)
	{
		this.displayName = displayName;
	}

	@Override
	public String getDataSetType()
	{
		return DataSetEntity.DATA_SET_TYPE_Excel;
	}

	@Override
	public void setDataSetType(String dataSetType)
	{
		// XXX 什么也不做，不采用抛出异常的方式，便于统一底层SQL查询语句
		// throw new UnsupportedOperationException();
	}

	@Override
	public User getCreateUser()
	{
		return createUser;
	}

	@Override
	public void setCreateUser(User createUser)
	{
		this.createUser = createUser;
	}

	@Override
	public Date getCreateTime()
	{
		return createTime;
	}

	@Override
	public void setCreateTime(Date createTime)
	{
		this.createTime = createTime;
	}

	@Override
	public int getDataPermission()
	{
		return dataPermission;
	}

	@Override
	public void setDataPermission(int dataPermission)
	{
		this.dataPermission = dataPermission;
	}
}
