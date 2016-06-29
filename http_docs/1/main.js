var j$ = jQuery.noConflict();
var RemoteGetObjectInfoResult; //global var of final results
var salesforceAccessURL = ''; //if value then links will use frontdoor.jsp on links to SalesForce pages
var loadphase = 1;
var fontawesomeloadIcon = "fa fa-spinner fa-pulse fa-3x fa-fw";
var jsforceAPIVersion = '36.0';
var conn;
var myOrgId = '';

var finalresult = {FXObjects: [],PermissionSets: [],ApexClassAccess: [],VFPageAccess: [],SystemPermissions: []};

//IE support
if (!String.prototype.startsWith)
{
	String.prototype.startsWith = function(searchString, position)
	{
		position = position || 0;
		return this.substr(position, searchString.length) === searchString;
	};
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}


/******************Event Handlers *************************************/

	function ViewInSalesForce()
	{
		if (conn)
		{
			window.open(salesforceAccessURL);
		}
	}
	
	function DoOathLoginLogin()
	{
		var myenv = j$('#id_environment').val();
		if (myenv != '')
		{
			j$('.loading').show();
			var oauth2 = GetOauth(myenv);
			var rurl =  oauth2.getAuthorizationUrl({scope: 'full', state:myenv});
			window.location.replace(rurl);
		}
	}

	function logout()
	{
		if (conn)
		{
			j$("#MainDetail").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});

			var logoutJSONPurl = conn.oauth2.revokeServiceUrl + '?token=' + conn.accessToken + '&callback=logoutcompleted'

			loadjscssfile(logoutJSONPurl,'js');

			/*
			conn.logout(function(err) 
			{
				j$("#MainDetail").LoadingOverlay("hide");
				if (err) 
				{ 
					ProcessError(err); 
				}
				window.location.replace(homeurl);
			});
			*/
		}
		else
		{
			window.location.replace(homeurl);
		}
	}

	function logoutcompleted(err)
	{
		if (err)
		{
			console.log('Error logging out. Error: ' + err);
		}
		window.location.replace(homeurl);
	}

	function ShowObjectModal(sobject, ancor)
	{
		var ort = FindRTPermissions(sobject);
		var ofp = FindFieldPermissions(sobject);
		var ofs = FindSobject(RemoteGetObjectInfoResult,sobject);
		//console.log(ofs);
		var oheader = '';
		if (ofs.CusomObjectId)
		{
			oheader = '<a href="' + salesforceAccessURL + '/' + ofs.CusomObjectId + '" target="_blank">' + ofs.Label + '</a> (' + ofs.APIName + ')';
		}
		else
		{
			oheader = ofs.Label;
		}
		j$('#OHeader').html('<h2>' + oheader + (ofs.ObjectDescribe.IsCustomTab == true ? ' Tab' : ' Object') +  ' Settings</h2>');
		var osresult = '';
		osresult += '<div id="GoToLocation" style="display:none;">'+ancor+'</div><div name="Top"/>';

		if (ofs.TabPermissions && ofs.TabPermissions.length > 0)
		{
			//osresult += '<a name="TabSettings"></a>';
			osresult += '<div name="TabSettings" class="container-full"><h4>Tab Settings</h4><div class="panel panel-default">';
			osresult += '<table id="OTabPermissionsTable" class="display" style="display:none;" cellspacing="0" width="100%">';
			osresult += '<thead>';
			osresult += '<tr>';
			osresult += '<th>Label</th>';
			osresult += '<th>Assigned</th>';
			osresult += '</tr>';
			osresult += '</thead>';
			osresult += '<tbody>';
			j$.each(ofs.TabPermissions,function(index, d)
			{
				osresult += '<tr>';
				osresult += '<td>' + d.Label + '</td>';
				osresult += '<td>' + GetSpanPermission(d.Assigned, true, d.AssignedGrantedBy, ofs, 'TabSetting') + '</td>'
				osresult += '</tr>';
			});
			osresult += '</tbody>';
			osresult += '</table>';
			osresult += '</div></div></div>';
			osresult += '<br/>';
		}

		if (ort && ort.length > 0)
		{
			//osresult += '<a name="RecordTypePermissions"/>';
			osresult += '<div name="RecordTypePermissions" class="container-full"><h4>Record Types Assignments</h4><div class="panel panel-default">';
			osresult += '<table id="ORTPermissionsTable" class="display" style="display:none;" cellspacing="0" width="100%">';
			osresult += '<thead>';
			osresult += '<tr>';
			osresult += '<th>Label</th>';
			osresult += '<th>API Name</th>';
			osresult += '<th>Assigned</th>';
			osresult += '<th>Default</th>';
			osresult += '</tr>';
			osresult += '</thead>';
			osresult += '<tbody>';
			j$.each(ort,function(index, d)
			{
				osresult += '<tr>';
				osresult += '<td>' + d.Label + '</td>';
				osresult += '<td>' + d.Name + '</td>';
				osresult += '<td>' + GetSpanPermission(d.Assigned, true, d.AssignedGrantedBy, ofs, 'Field') + '</td>'
				osresult += '<td>' + GetSpanPermission(d.Default, true, d.DefaultGrantedBy, ofs, 'Field') + '</td>'
				osresult += '</tr>';
			});
			osresult += '</tbody>';
			osresult += '</table>';
			osresult += '</div></div></div>';
			osresult += '<br/>';
		}

		if (ofs.IsPermissionable == true)
		{
			//osresult += '<a name="ObjectPermissions"/>';
			osresult += '<div name="ObjectPermissions" class="container-full"><h4>Object Permissions</h4><div class="panel panel-default">';
			osresult += '<table id="OFXObjectsTable" class="display" style="display:none;" cellspacing="0" width="100%">';
			osresult += '<thead>';
			osresult += '<tr>';
			osresult += '<th>Permission Name</th>';
			osresult += '<th>Enabled</th>';
			osresult += '</tr>';
			osresult += '</thead>';
			osresult += '<tbody>';
			osresult += '<tr><td>Read</td><td>' + GetSpanPermission(ofs.HasRead, true, ofs.HasReadGrantedBy, ofs, 'Object') + '</td></tr>';
			osresult += '<tr><td>Create</td><td>' + GetSpanPermission(ofs.HasCreate, true, ofs.HasCreateGrantedBy, ofs, 'Object') + '</td></tr>';
			osresult += '<tr><td>Edit</td><td>' + GetSpanPermission(ofs.HasEdit, true, ofs.HasEditGrantedBy, ofs, 'Object') + '</td></tr>';
			osresult += '<tr><td>Delete</td><td>' + GetSpanPermission(ofs.HasDeleteRead, true, ofs.HasDeleteGrantedBy, ofs, 'Object') + '</td></tr>';
			osresult += '<tr><td>View All</td><td>' + GetSpanPermission(ofs.HasViewAll, true, ofs.HasViewAllGrantedBy, ofs, 'Object') + '</td></tr>';
			osresult += '<tr><td>Modify All</td><td>' + GetSpanPermission(ofs.HasModifyAllRead, true, ofs.HasModifyAllGrantedBy, ofs, 'Object') + '</td></tr>';
			osresult += '</tbody>';
			osresult += '</table>';
			osresult += '</div></div></div>';
		}

		if (ofs.OneFieldIsPermissionable == true && ofp)
		{
			//osresult += '<a name="FieldPermissions"/>';
			osresult += '<br/>';
			osresult += '<div name="FieldPermissions" class="container-full"><h4>Field Permissions</h4><div class="panel panel-default">';
			osresult += '<table id="OFieldPermissionsTable" class="display" style="display:none;" cellspacing="0" width="100%">';
			osresult += '<thead>';
			osresult += '<tr>';
			osresult += '<th>Label</th>';
			osresult += '<th>API Name</th>';
			osresult += '<th>Type</th>';
			osresult += '<th>Read</th>';
			osresult += '<th>Edit</th>';
			osresult += '</tr>';
			osresult += '</thead>';
			osresult += '<tbody>';
			j$.each(ofp,function(index, d)
			{
				osresult += '<tr>';
				osresult += '<td>' + d.Label + '</td>';
				osresult += '<td>' + d.Name + '</td>';
				var mytype = d.FieldDescribe.type;
				if (!mytype)
				{
					mytype = '';
				}
				if (mytype == 'Lookup' || mytype == 'MasterDetail')
				{
					var tsobjectype = d.FieldDescribe.referenceTo;
					if (!tsobjectype)
					{
						var tname = d.FieldDescribe.fullName;
						if (tname.endsWith('Id'))
						{
							tname = tname.substring(0, tname.length - 2);
						}
						if (tname == 'Owner')
						{
							tname = 'User';
						}
						if (tname == 'ReportsTo')
						{
							tname = 'Contact';
						}
						tsobjectype = tname;
					}
					
					var tsobject = FindSobject(RemoteGetObjectInfoResult,tsobjectype);
					if (tsobject)
					{
						mytype += '(<a onclick="ShowObjectModal(&apos;' + tsobject.APIName + '&apos;,&apos;FieldPermissions&apos;);">' + tsobject.Label + '</a>)';
					}
					else
					{
						console.log('Error 896155');
						mytype += '(' + tsobjectype + ')';
					}
				}

				osresult += '<td>' + mytype+ '</td>';
				
				osresult += '<td>' + GetSpanPermission(d.HasRead, d.ReadIsAssignable, d.HasReadGrantedBy, ofs, 'Field') + '</td>'
				osresult += '<td>' + GetSpanPermission(d.HasEdit, d.EditIsAssignable, d.HasEditGrantedBy, ofs, 'Field') + '</td>'
				osresult += '</tr>';
			});
			osresult += '</tbody>';
			osresult += '</table>';
			osresult += '</div></div></div>';
		}
		

		if(ofs.ChildRelatedObjects.length > 0 || ofs.ParentRelatedObjects.length > 0)
		{
			//osresult += '<a name="Relationships"/>';
			osresult += '<div name="Relationships" class="container-full"><h4>Relationships</h4><div class="panel panel-default">';
			osresult += '<table id="ORelationPermissionsTable" class="display" style="display:none;" cellspacing="0" width="100%">';
			osresult += '<thead>';
			osresult += '<tr>';
			osresult += '<th>Relationship Type</th>';
			osresult += '<th>Object</th>';
			osresult += '<th>Object API Name</th>';
			osresult += '<th>Field</th>';
			osresult += '<th>Field API Name</th>';
			osresult += '<th>Field Type</th>';
			osresult += '</tr>';
			osresult += '</thead>';
			osresult += '<tbody>';

			j$.each(ofs.ChildRelatedObjects,function(index, d)
			{
				var ofsc= FindSobject(RemoteGetObjectInfoResult,d);
				if (ofsc.fields && ofsc.fields.length > 0)
				{
					for (var iofsc1 = 0; iofsc1 < ofsc.fields.length; iofsc1++)
					{
						var fld = ofsc.fields[iofsc1];
						if (fld.FieldDescribe.referenceTo == ofs.APIName)
						{
							osresult += '<tr>';
							osresult += '<td>Child</td>';
							osresult += '<td><a onclick="ShowObjectModal(&apos;' + ofsc.APIName + '&apos;,&apos;Relationships&apos;);">' + ofsc.Label + '</a></td>';
							osresult += '<td><a onclick="ShowObjectModal(&apos;' + ofsc.APIName + '&apos;,&apos;Relationships&apos;);">' + ofsc.APIName + '</a></td>';
							osresult += '<td>'+fld.FieldDescribe.label+'</td>'
							osresult += '<td>'+fld.FieldDescribe.fullName+'</td>'
							osresult += '<td>'+fld.FieldDescribe.type+'</td>'
							osresult += '</tr>';
						}
					}
				}
			});

			j$.each(ofs.ParentRelatedObjects,function(index, d)
			{
				if (ofs.fields && ofs.fields.length > 0)
				{
					for (var iofs1 = 0; iofs1 < ofs.fields.length; iofs1++)
					{
						var fld = ofs.fields[iofs1];
						if (fld.FieldDescribe.referenceTo == d)
						{
							var ofsc= FindSobject(RemoteGetObjectInfoResult,d);
							if (ofsc)
							{
								osresult += '<tr>';
								osresult += '<td>Parent</td>';
								osresult += '<td><a onclick="ShowObjectModal(&apos;' + ofsc.APIName + '&apos;,&apos;Relationships&apos;);">' + ofsc.Label + '</a></td>';
								osresult += '<td><a onclick="ShowObjectModal(&apos;' + ofsc.APIName + '&apos;,&apos;Relationships&apos;);">' + ofsc.APIName + '</a></td>';
								osresult += '<td>'+fld.FieldDescribe.label+'</td>'
								osresult += '<td>'+fld.FieldDescribe.fullName+'</td>'
								osresult += '<td>'+fld.FieldDescribe.type+'</td>'
								osresult += '</tr>';
							}
						}
					}
				}
			});
			osresult += '</tbody>';
			osresult += '</table>';
			osresult += '</div></div></div>';
			osresult += '<br/>';
		}


		var isshown = (j$("#ObjectModal").data('bs.modal') || {}).isShown
		if (isshown == true)
		{
			
			j$('#OTabPermissionsTable').DataTable().destroy();
			j$('#ORTPermissionsTable').DataTable().destroy();
			j$('#OFXObjectsTable').DataTable().destroy();
			j$('#OFieldPermissionsTable').DataTable().destroy();
			j$('#ORelationPermissionsTable').DataTable().destroy();

			j$('#OTabPermissionsTable').empty();
			j$('#ORTPermissionsTable').empty();
			j$('#OFXObjectsTable').empty();
			j$('#OFieldPermissionsTable').empty();
			j$('#ORelationPermissionsTable').empty();

			j$('#OBody').html(osresult);
			loadObjectModal();
		}
		else
		{
			j$('#OBody').html(osresult);
			j$('#ObjectModal').modal('show');
		}
	}

	//used to close modal on back pressed
	//must add history value on shown.bs.modal event
	j$(window).on('popstate', function() 
	{ 
	    j$(".modal").modal('hide');
		if (window.location.hash == "#UserSerch")
		{
			j$('#mainSearchContent').show();
    		j$('#mainContent').hide();
    		j$('#searchtypeahead').val('');
			
		}
	});

	j$(window).resize(function()
	{
		UpdateModalBodyMaxHeight();
	});

	function UpdateModalBodyMaxHeight()
	{
		var modalshown = (j$("#ObjectModal").data('bs.modal') || {}).isShown;
		if (modalshown == true)
		{
			var windowsheight = j$(window).height();
			var modaltitleHeight = j$('.modal-title').outerHeight(true);
			var closebuttonHeight = j$('#CloseButton').outerHeight(true);
			if (isNaN(windowsheight) || isNaN(modaltitleHeight) || isNaN(closebuttonHeight) ) 
			{
			    alert("something is wrong, cant set height!");
			} else 
			{
			   var maxdocheight = windowsheight - modaltitleHeight - 30 - closebuttonHeight - 50;
			   j$('#OBody').css('height', maxdocheight);
			}
		}
	}

	j$('#ObjectModal').on('shown.bs.modal', function()
	{
		var urlReplace = "#" + j$(this).attr('id'); // make the hash the id of the modal shown
    	history.pushState(null, null, urlReplace); // push state that hash into the url
		loadObjectModal();
	});

	function loadObjectModal()
	{
		j$('#OTabPermissionsTable').show();
		j$('#ORTPermissionsTable').show();
		j$('#OFXObjectsTable').show();
		j$('#OFieldPermissionsTable').show();
		j$('#ORelationPermissionsTable').show();
		
		UpdateModalBodyMaxHeight();

		j$('body').css(
		{
			overflow: 'hidden'
		});

		j$('#OTabPermissionsTable').DataTable(
		{
			"scrollCollapse": true,
			"paging": false,
			"stateSave": false,
			"searching": false,
			"ordering": false,
			"info": false,
			"columnDefs": [
				{
					"targets": [1],
					"visible": true,
					"searchable": false,
					"orderDataType": "dom-checkbox-glyphicon"
				},
				{
					"targets": [0],
					"width": "20%"
				}
			]
		});

		
		j$('#ORTPermissionsTable').DataTable(
		{
			"scrollCollapse": true,
			"paging": false,
			"order": [0, "asc"],
			"stateSave": true,
			"searching": false,
			"info": false,
			"columnDefs": [
			{
				"targets": [2, 3],
				"visible": true,
				"searchable": false,
				"orderDataType": "dom-checkbox-glyphicon"
			}]
		});

		j$('#OFXObjectsTable').DataTable(
		{
			"scrollCollapse": true,
			"paging": false,
			"stateSave": false,
			"searching": false,
			"ordering": false,
			"info": false,
			"columnDefs": [
				{
					"targets": [1],
					"visible": true,
					"searchable": false,
					"orderDataType": "dom-checkbox-glyphicon"
				},
				{
					"targets": [0],
					"width": "20%"
				}
			]
		});

		var fptable = j$('#OFieldPermissionsTable').DataTable(
		{
			"scrollCollapse": false,
			"paging": false,
			"order": [0, "asc"],
			"stateSave": true,
			"searching": true,
			/*"stateSaveParams": function (settings, data) 
            {
                delete data.search;
                
            },*/
			"columnDefs": [
			{
				"targets": [3, 4],
				"visible": true,
				"searchable": false,
				"orderDataType": "dom-checkbox-glyphicon"
			}]
		});
		fptable.search('').columns().search('').draw();

		var orptable = j$('#ORelationPermissionsTable').DataTable(
		{
			"scrollCollapse": false,
			"paging": false,
			"order": [0, "asc"],
			"stateSave": true,
			"searching": true
		});
		orptable.search('').columns().search('').draw();

		var gotoloc = j$('#GoToLocation').html();
		if (gotoloc && gotoloc.length > 0)
		{
			var aTag = j$("div[name='"+ gotoloc +"']");
			if (aTag.length)
			{
				var loc1 = (j$("div[name='"+ gotoloc +"']").offset() || { "top": NaN }).top;
				var loc2 = (j$('#OBody').offset() || { "top": NaN }).top;
				if (isNaN(loc1) || isNaN(loc2)) {
				    //alert("something is wrong, no top");
				} else {
				    j$('#OBody').animate({scrollTop: loc1 - loc2},0);
				}
			}
		}
	}

	j$('#ObjectModal').on('hidden.bs.modal', function()
	{
		j$('body').css(
		{
			overflow: ''
		});
		var urlReplace = "#" + j$(this).attr('id'); 
		if (window.location.hash == urlReplace)
		{
			window.history.back();
		}
	});

	j$.fn.dataTable.ext.order['dom-checkbox-glyphicon'] = function(settings, col)
	{
		return this.api().column(col,
		{
			order: 'index'
		}).nodes().map(function(td, i)
		{
			return j$('span', td).attr('data-checked') == 'true' ? '1' : '0';
		});
	}

	j$(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) 
	{
    	if (e.target.hash == "#UserDetails" && loadphase  == 1)
    	{
    		j$("#UserDetails").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
    	}
    	if (e.target.hash == "#FXObjectPermissions" && loadphase <= 2)
    	{
    		j$("#FXObjectPermissions").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
    	}
    	if (e.target.hash == "#ApexClasses" && loadphase  == 1)
    	{
    		j$("#ApexClasses").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
    	}
    	if (e.target.hash == "#VisualforcePages" && loadphase  == 1)
    	{
    		j$("#VisualforcePages").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
    	}
    	if (e.target.hash == "#SystemPermissions" && loadphase  == 1)
    	{
    		j$("#SystemPermissions").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
    	}
	});


/******************END Event Handlers *************************************/

j$(document).ready(function()
{

	var sinput = j$('#searchtypeahead');
	sinput.typeahead(
	{
		source: function(query, process) 
	    {

	    	var myquery = "SELECT Id,FirstName, LastName, IsActive,Username FROM User where FirstName like '%"+query+"%' or LastName like '%"+query+"%' or Username like '%"+query+"%' limit 10";
			QueryRecords(conn, myquery, function(searcherr, searchResults)
			{
				if (searcherr)
				{
					ProcessError(searcherr);
				}
				else
				{
					var searchresults = [];
					j$.each(searchResults,function(index, d)
					{
						var searchresult = {id:d.Id,name:d.FirstName + ' ' + d.LastName + ' (' + d.Username + ') ' + (d.IsActive == true ? 'Active' : 'Not Active')};
						searchresults.push(searchresult);
					});
					process(searchresults);
				}
			});
	    },
	    minLength: 2,
	    afterSelect: function(selected)
	    {
	    	if (selected)
	    	{
	    		j$('#mainSearchContent').hide();
	    		j$('#mainContent').show();
        		GetDataforUser(selected.id);
	    	}
	    },
	    delay: 500,
	    items: 10,
	    hint: true,
  		highlight: true

	});

	var mycode = getParameterName('code');
    var mystate = getParameterName('state');

    if (mycode && mystate)
    {
    	CompleteOauthlogin(mycode,mystate);
    }
    else if (myusername != '' && mypassword !='')
    {
    	if (mystate == '')
    	{
    		mystate = 'Production';
    	}
    	doSoaplogin(myusername,mypassword, mystate);
    }
    else
    {
    	j$('#logindiv').show();
    }
});

/******************Support Functions *************************************/

	function CompleteOauthlogin(code, state)
	{
		j$("#MainDetail").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
    	var myconnoptions = {oauth2: GetOauth(state)};
    	if (proxyurl)
		{
			myconnoptions.proxyUrl = proxyurl;
		}
    	conn = new jsforce.Connection(myconnoptions);
	    conn.authorize(code, function(err, userInfo) 
	    {
	    	try
	    	{
		        if (err) 
	        	{ 
	        		ProcessError(err);
	        		window.location.replace(homeurl);
	        	}
	        	else
	        	{
	        		j$('#logindiv').hide();
	        		//j$('#mainContent').show();
	        		
			        myOrgId = userInfo.organizationId;
			        myuserid = userInfo.id;
					//mysessionId = conn.accessToken;
					if (conn.instanceUrl)
					{
						salesforceAccessURL = conn.instanceUrl + '/secur/frontdoor.jsp?sid=' + conn.accessToken + '&retURL='
					}
					/*
					if (targetUserId == undefined || targetUserId == null || targetUserId == '')
					{
						//setup for testing
						targetUserId = userInfo.id;
					}
					*/
	        		CheckAccessAndSetup();
	        	}
        	}
        	catch (err)
			{
				console.log(err);
				ProcessError(err);
				window.location.replace(homeurl);
			}
	    });
	}

	function CheckAccessAndSetup()
	{
		j$("#MainDetail").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
		CurrentUserHasModifyAllDataAccess(myuserid, function(err, hasaccessresult, myuserdetails)
		{
			try
			{
				if (err)
				{
					ProcessError(err);
					window.location.replace(homeurl);
				}
				else
				{
					if (hasaccessresult == false)
					{
						ProcessError('Error: You must have permission Modify All Data to use this page!');
						window.location.replace(homeurl);
					}
					else
					{
						var myquery = "SELECT Id,Name FROM Organization where Id = '"+myOrgId+"'";
						QueryRecords(conn, myquery, function(Orgyerr, OrgResults)
						{
							try
							{
								if (Orgyerr)
								{
									ProcessError('Error:' + Queryerr);
									window.location.replace(homeurl);
								}
								else
								{
									j$('#userdetail').html((myuserdetails.Name + ' AT '+ OrgResults[0].Name +' ON API ' + jsforceAPIVersion).toUpperCase() );
									j$('#username').html('Username: ' + myuserdetails.Username);
        							j$('#loginDetails').show();
        							j$("#MainDetail").LoadingOverlay('hide',true);

        							//support back to search
    								history.pushState(null, null, "#UserSerch");
        							
        							j$('#mainSearchContent').show();
        						}
							}
							catch (err)
							{
								console.log(err);
								ProcessError(err);
								window.location.replace(homeurl);
							}
						});
					}
				}
			}
			catch (err)
			{
				console.log(err);
				ProcessError(err);
				window.location.replace(homeurl);
			}
		});
	}

	function GetDataforUser(targetUid)
	{
		history.pushState(null, null, "#UserDetail");
		finalresult = {FXObjects: [],PermissionSets: [],ApexClassAccess: [],VFPageAccess: [],SystemPermissions: []};
		if (targetUid == undefined || targetUid == null || targetUid == '')
		{
			ProcessError('Id not found');
		}
		else
		{
			///j$("#MainDetail").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
			j$("#MainDetail").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
			conn.sobject("Profile").describe(function(err, Profilemeta)
			{
				try
				{
					if (err)
					{
						ProcessError(err);
					}
					else
					{
						conn.sobject("PermissionSet").describe(function(err, Permissionsetmeta)
						{
							try
							{
								if (err)
								{
									ProcessError(err);
								}
								else
								{
									//console.log(Profilemeta);
									var userprofilefields = '';
									for (var iupf1 = 0; iupf1 < Profilemeta.fields.length; iupf1++)
									{
										var myfield = Profilemeta.fields[iupf1];
										userprofilefields += ', Profile.' + myfield.name;
									}
									var myUser;
									var myquery = "select Id, UserRole.Name, UserRoleId,Name,ProfileId,Profile.UserLicense.Name " + userprofilefields + " from User where id ='" + targetUid + "'";
									QueryRecords(conn, myquery, function(UserQueryerr, UserQueryResults)
									{
										try
										{
											if (UserQueryerr)
											{
												ProcessError('Error:' + UserQueryerr);
											}
											else
											{
												finalresult.Userdetail = UserQueryResults[0];
												myUser = UserQueryResults[0];
												var searchids = "'" + myUser.ProfileId + "'";
												var searchprofilename = myUser.Profile.Name;
												var searchPermissionSetnames = [];
												var searchObjects = [];
												var perms = new HashTable();
												myquery = "Select Id from PermissionSet where ProfileId = '" + myUser.ProfileId + "'";
												QueryRecords(conn, myquery, function(ProfilePermissionSetQueryerr, ProfilePermissionSetQueryResults)
												{
													try
													{
														if (ProfilePermissionSetQueryerr)
														{
															ProcessError('Error:' + ProfilePermissionSetQueryerr);
														}
														else
														{
															var ProfilePermissionSetId = ProfilePermissionSetQueryResults[0].Id;
															searchids += ",'" + ProfilePermissionSetId + "'";
															var permissionsetfields = '';
															for (var ipsf1 = 0; ipsf1 < Permissionsetmeta.fields.length; ipsf1++)
															{
																var myfield = Permissionsetmeta.fields[ipsf1];
																if (permissionsetfields != '')
																{
																	permissionsetfields += ',';
																}
																permissionsetfields += myfield.name;
															}
															myquery = "select " + permissionsetfields + " from PermissionSet where IsOwnedByProfile = false and Id in (SELECT PermissionSetId FROM PermissionSetAssignment where AssigneeId = '" + targetUid + "')";
															QueryRecords(conn, myquery, function(PermissionSetQueryerr, PermissionSetQueryResults)
															{
																try
																{
																	if (PermissionSetQueryerr)
																	{
																		ProcessError('Error:' + PermissionSetQueryerr);
																	}
																	else
																	{
																		//console.log(PermissionSetQueryResults);
																		if (PermissionSetQueryResults != undefined)
																		{
																			for (var ipsr1 = 0; ipsr1 < PermissionSetQueryResults.length; ipsr1++)
																			{
																				var QueryResult = PermissionSetQueryResults[ipsr1];
																				var mypermname = (QueryResult.NamespacePrefix != undefined && QueryResult.NamespacePrefix.length > 0 ? QueryResult.NamespacePrefix + '__' : '') + QueryResult.Name;
																				searchPermissionSetnames.push(mypermname);
																				searchids += ",'" + QueryResult.Id + "'";
																				perms.setItem(QueryResult.Id, QueryResult);
																				var psinfo = {
																					Name: mypermname,
																					Label: QueryResult.Label,
																					Description: (QueryResult.Description != undefined && QueryResult.Description != null ? QueryResult.Description : ''),
																					Id: QueryResult.Id
																				};
																				finalresult.PermissionSets.push(psinfo);
																			}
																		}
																		for (var ipm1 = 0; ipm1 < Profilemeta.fields.length; ipm1++)
																		{
																			var myfield = Profilemeta.fields[ipm1];
																			if (myfield.name.startsWith('Permissions'))
																			{
																				var si = {
																					GrantedBy: [],
																					HasAccess: false,
																					Label: myfield.label,
																					Name: myfield.name
																				};
																				var panswer = myUser.Profile[myfield.name];
																				if (panswer != undefined && panswer == true)
																				{
																					si.HasAccess = true;
																					si.GrantedBy.push(
																					{
																						Id: myUser.Profile.Id,
																						IsProfile: true,
																						Name: myUser.Profile.Name
																					});
																				}
																				if (PermissionSetQueryResults != undefined)
																				{
																					for (var ipsr1 = 0; ipsr1 < PermissionSetQueryResults.length; ipsr1++)
																					{
																						var permsetresult = PermissionSetQueryResults[ipsr1];
																						var psanswer = permsetresult[myfield.name];
																						if (psanswer != undefined && psanswer == true)
																						{
																							si.HasAccess = true;
																							si.GrantedBy.push(
																							{
																								Id: permsetresult.Id,
																								IsProfile: false,
																								Name: permsetresult.Name
																							});
																						}
																					}
																				}
																				finalresult.SystemPermissions.push(si);
																			}
																		}

																		DescribeAllSObjects(conn, function(DescribeAllSObjectserr, DescribeAllSObjectsResult,Customtabnames)
																		{
																			try
																			{
																				if (DescribeAllSObjectserr)
																				{
																					console.log('Warning: There was an error Describing objects. Error Details: ' + DescribeAllSObjectserr);
																					// alert( 'Warning: There was an error Describing objects. Error Details: ' + DescribeAllSObjectserr);
																				}
																				//recordTypes
																				//console.log(DescribeAllSObjectsResult);
																				var ChildParentRelationships = new HashTable();
																				var ParentChildRelationships = new HashTable();
																				var SobjectHT = new HashTable();
																				var RelatedFXObjectsHT = new HashTable();
																				j$.each(DescribeAllSObjectsResult, function(index, item)
																				{
																					var sobjecttype = item.fullName;
																					
																					RelatedFXObjectsHT.setItem(sobjecttype, item);
																					var fieldresults = GetFieldResults(item);
																					var recordTyperesults = GetRecordTypeResults(item,myUser.ProfileId, searchprofilename);
																					var TabPerms = GetTabResults(item);
																					var s1 = {
																						APIName: sobjecttype,
																						HasCreate: false,
																						HasCreateGrantedBy: [],
																						HasDelete: false,
																						HasDeleteGrantedBy: [],
																						HasEdit: false,
																						HasEditGrantedBy: [],
																						HasModifyAll: false,
																						HasModifyAllGrantedBy: [],
																						HasRead: false,
																						HasReadGrantedBy: [],
																						HasViewAll: false,
																						HasViewAllGrantedBy: [],
																						Label: item.label,
																						OneFieldIsPermissionable: item.OneFieldIsPermissionable,
																						fields: fieldresults,
																						recordtypes: recordTyperesults,
																						/*isCustom: false,*/
																						isCustomSetting: false,
																						CusomObjectId: item.CusomObjectId,
																						ObjectDescribe: item,
																						IsPermissionable: item.IsPermissionable,
																						TabPermissions : TabPerms,
																						ChildRelatedObjects:[],
																						ParentRelatedObjects:[],

																					};
																					finalresult.FXObjects.push(s1);
																					searchObjects.push(sobjecttype);
																					
																					SobjectHT.setItem(sobjecttype, item);
																					var myparents = [];
																					var myfields = GetDescribeSObjectField(item.fields);
																					for (var ifld1 = 0; ifld1 < myfields.length; ifld1++)
																					{
																						var field = myfields[ifld1];
																						if ((field.type == 'MasterDetail' || field.type == 'Lookup') && field.referenceTo != undefined && field.referenceTo != null)
																						{
																							if (myparents.indexOf(field.referenceTo) < 0)
																							{
																								myparents.push(field.referenceTo);
																							}
																						}
																					}
																					if (myparents.length > 0)
																					{
																						ChildParentRelationships.setItem(sobjecttype, myparents);
																						for (var icpr1 = 0; icpr1 < myparents.length; icpr1++)
																						{
																							var myparent = myparents[icpr1];
																							var mychildern = ParentChildRelationships.hasItem(myparent) ? ParentChildRelationships.getItem(myparent) : [];
																							if (mychildern.indexOf(sobjecttype) < 0)
																							{
																								mychildern.push(sobjecttype);
																							}
																							if (mychildern.length > 0)
																							{
																								ParentChildRelationships.setItem(myparent, mychildern);
																							}
																						}
																					}
																				});
																			
																				//add child and panert ralationshipe
																				for (var ifor1 = 0; ifor1 < finalresult.FXObjects.length; ifor1++)
																				{
																					var fobj = finalresult.FXObjects[ifor1];
																					if (ParentChildRelationships.hasItem(fobj.APIName))
																					{
																						finalresult.FXObjects[ifor1].ChildRelatedObjects = ParentChildRelationships.getItem(fobj.APIName);
																					}
																					if (ChildParentRelationships.hasItem(fobj.APIName))
																					{
																						finalresult.FXObjects[ifor1].ParentRelatedObjects = ChildParentRelationships.getItem(fobj.APIName);
																					}
																				}
																				
																				var profileId = myUser.ProfileId;
																				var profileName = myUser.Profile.Name;
																				myquery = "SELECT Id, Name,NamespacePrefix,Status, (SELECT Id, ParentId,SetupEntityId FROM SetupEntityAccessItems where ParentId in ( " + searchids + " )) FROM ApexClass";
																				QueryRecords(conn, myquery, function(ApexClassQueryerr, ApexClassQueryResults)
																				{
																					try
																					{
																						if (ApexClassQueryerr)
																						{
																							ProcessError('Error:' + ApexClassQueryerr);
																						}
																						else
																						{
																							if (ApexClassQueryResults != undefined)
																							{
																								for (var iaqr1 = 0; iaqr1 < ApexClassQueryResults.length; iaqr1++)
																								{
																									var QueryResult = ApexClassQueryResults[iaqr1];
																									var myname = (QueryResult.NamespacePrefix != null ? QueryResult.NamespacePrefix + '.' + QueryResult.Name : QueryResult.Name).replace(' ', '_');
																									var si = {
																										GrantedBy: [],
																										HasAccess: false,
																										Label: myname,
																										Name: myname
																									};
																									if (QueryResult.SetupEntityAccessItems != undefined)
																									{
																										if (Array.isArray(QueryResult.SetupEntityAccessItems.records))
																										{
																											for (var isea1 = 0; isea1 < QueryResult.SetupEntityAccessItems.records.length; isea1++)
																											{
																												var sa = QueryResult.SetupEntityAccessItems.records[isea1];
																												si.HasAccess = true;
																												var myid = sa.ParentId == profileId || sa.ParentId == ProfilePermissionSetId ? profileId : sa.ParentId;
																												var isprofile = sa.ParentId == profileId || sa.ParentId == ProfilePermissionSetId;
																												var myparentname = sa.ParentId == profileId || sa.ParentId == ProfilePermissionSetId ? profileName : perms.getItem(sa.ParentId).Name;
																												si.GrantedBy.push(
																												{
																													Id: myid,
																													IsProfile: isprofile,
																													Name: myparentname
																												});
																											}
																										}
																										else
																										{
																											Alert('Error 99901');
																										}
																									}
																									finalresult.ApexClassAccess.push(si);
																								}
																							}
																							myquery = "SELECT Id, Name,NamespacePrefix,MasterLabel, (SELECT Id, ParentId,SetupEntityId FROM SetupEntityAccessItems where ParentId in ( " + searchids + " )) FROM ApexPage";
																							QueryRecords(conn, myquery, function(ApexPageQueryerr, ApexPageQueryResults)
																							{
																								try
																								{
																									if (ApexPageQueryerr)
																									{
																										ProcessError('Error:' + ApexPageQueryerr);
																									}
																									else
																									{
																										if (ApexPageQueryResults != undefined)
																										{
																											for (var iapq = 0; iapq < ApexPageQueryResults.length; iapq++)
																											{
																												var QueryResult = ApexPageQueryResults[iapq];
																												var myname = (QueryResult.NamespacePrefix != null ? QueryResult.NamespacePrefix + '.' + QueryResult.Name : QueryResult.Name).replace(' ', '_');
																												var si = {
																													GrantedBy: [],
																													HasAccess: false,
																													Label: myname,
																													Name: myname
																												};
																												if (QueryResult.SetupEntityAccessItems != undefined)
																												{
																													if (Array.isArray(QueryResult.SetupEntityAccessItems.records))
																													{
																														for (var iapq2 = 0; iapq2 < QueryResult.SetupEntityAccessItems.records.length; iapq2++)
																														{
																															var sa = QueryResult.SetupEntityAccessItems.records[iapq2];
																															si.HasAccess = true;
																															var myid = sa.ParentId == profileId || sa.ParentId == ProfilePermissionSetId ? profileId : sa.ParentId;
																															var isprofile = sa.ParentId == profileId || sa.ParentId == ProfilePermissionSetId;
																															var myparentname = sa.ParentId == profileId || sa.ParentId == ProfilePermissionSetId ? profileName : perms.getItem(sa.ParentId).Name;
																															si.GrantedBy.push(
																															{
																																Id: myid,
																																IsProfile: isprofile,
																																Name: myparentname
																															});
																														}
																													}
																													else
																													{
																														Alert('Error 99902');
																													}
																												}
																												finalresult.VFPageAccess.push(si);
																											}
																										}
																										ProcessFinalResult(finalresult, 1, function(result)
																										{
																											loadphase = 2;
																											j$("#MainDetail").LoadingOverlay("hide", true);
																											j$("#UserDetails").LoadingOverlay("hide", true);
																										    j$("#ApexClasses").LoadingOverlay("hide", true);
																										    j$("#VisualforcePages").LoadingOverlay("hide", true);
																										    j$("#SystemPermissions").LoadingOverlay("hide", true);
																										});
																										var mypackage = {
																											'types': [],
																											'version': jsforceAPIVersion
																										};
																										mypackage.types.push(
																										{
																											'members': MetaDataApiName(searchprofilename),
																											'name': 'Profile'
																										});
																										mypackage.types.push(
																										{
																											'members': '*',
																											'name': 'CustomField'
																										});
																										mypackage.types.push(
																										{
																											'members': searchObjects,
																											'name': 'CustomObject'
																										});

																										var searchTabs = searchObjects;

																										if(Customtabnames)
																										{
																											for (var itab = 0; itab < Customtabnames.length; itab++)
																											{
																												var Customtabname = Customtabnames[itab];
																												if (searchTabs.indexOf(Customtabname) < 0)
																												{
																													searchTabs.push(Customtabname);
																												}
																											}
																										}
																										mypackage.types.push(
																										{
																											'members': searchTabs,
																											'name': 'CustomTab'
																										});
																										if (searchPermissionSetnames.length > 0)
																										{
																											mypackage.types.push(
																											{
																												'members': searchPermissionSetnames,
																												'name': 'PermissionSet'
																											});
																										}
																										conn.metadata.retrieve(
																										{
																											unpackaged: mypackage
																										}, function(retreiveerr, retreivemetadata)
																										{
																											try
																											{
																												if (retreiveerr)
																												{
																													ProcessError(retreiveerr);
																												}
																												else
																												{
																													DocheckRetrieveStatus(conn, retreivemetadata.id, function(retreivemetadataresulterr, retreivemetadataresult)
																													{
																														try
																														{
																															if (retreivemetadataresulterr)
																															{
																																ProcessError(retreivemetadataresulterr);
																															}
																															else
																															{
																																AddZipContentsToHashTableAsJson(retreivemetadataresult.zipFile, function(zipresultserr, zipresults)
																																{
																																	try
																																	{
																																		if (zipresultserr)
																																		{
																																			ProcessError(zipresultserr);
																																		}
																																		else
																																		{

																																			for (var iobj = 0; iobj < finalresult.FXObjects.length; iobj++)
																																			{
																																				var tobj = finalresult.FXObjects[iobj];
																																				if (tobj.ObjectDescribe.IsCustomTab == true)
																																				{
																																					var metatabname = 'unpackaged/tabs/' + tobj.ObjectDescribe.fullName + '.tab';
																																					if (zipresults.hasItem(metatabname) == true)
																																					{
																																						var mydetail = zipresults.getItem(metatabname);
																																						if(mydetail.CustomTab.label)
																																						{
																																							finalresult.FXObjects[iobj].Label = mydetail.CustomTab.label;
																																						}
																																					}
																																				}
																																			}


																																			//add results for profile
																																			var profilepackagename = 'unpackaged/profiles/' + MetaDataApiName(searchprofilename).replace(".", "%2E").replace("(", "%28").replace(")", "%29").replace("/", "%2F") + '.profile';
																																			if (zipresults.hasItem(profilepackagename) == true)
																																			{
																																				var mydetail = zipresults.getItem(profilepackagename);
																																				if (mydetail.Profile.fieldPermissions != undefined)
																																				{
																																					for (var impf = 0; impf < mydetail.Profile.fieldPermissions.length; impf++)
																																					{
																																						var mypermission2 = mydetail.Profile.fieldPermissions[impf];
																																						SetFeildResult(mypermission2, myUser.ProfileId, finalresult, searchprofilename, true);
																																					}
																																				}
																																				if (mydetail.Profile.objectPermissions != undefined)
																																				{
																																					for (var impo = 0; impo < mydetail.Profile.objectPermissions.length; impo++)
																																					{
																																						var mypermission2 = mydetail.Profile.objectPermissions[impo];
																																						SetObjectResult(mypermission2, myUser.ProfileId, finalresult, searchprofilename, true);
																																					}
																																				}
																																				if (mydetail.Profile.recordTypeVisibilities)
																																				{
																																					for (var impr = 0; impr < mydetail.Profile.recordTypeVisibilities.length; impr++)
																																					{
																																						var myrtvis = mydetail.Profile.recordTypeVisibilities[impr];
																																						SetRecordTypeResult(myrtvis, myUser.ProfileId, finalresult, searchprofilename, true);
																																					}
																																				}
																																				
																																				if (mydetail.Profile.tabVisibilities)
																																				{
																																					for (var impt = 0; impt < mydetail.Profile.tabVisibilities.length; impt++)
																																					{
																																						var mytabvis = mydetail.Profile.tabVisibilities[impt];
																																						SetTabPermissionResult(mytabvis, myUser.ProfileId, finalresult, searchprofilename, true);
																																					}
																																				}
																																				
																																			}
																																			else
																																			{
																																				console.log('Error Metadata not found for ' + profilepackagename);
																																				alert('Error 99908');
																																			}
																																			if (PermissionSetQueryResults != undefined)
																																			{
																																				for (var ipr44 = 0; ipr44 < PermissionSetQueryResults.length; ipr44++)
																																				{
																																					var QueryResult = PermissionSetQueryResults[ipr44];
																																					var permname = (QueryResult.NamespacePrefix != undefined && QueryResult.NamespacePrefix.length > 0 ? QueryResult.NamespacePrefix + '__' : '') + QueryResult.Name;
																																					//(QueryResult.NamespacePrefix != undefined && QueryResult.NamespacePrefix.length > 0 ? QueryResult.NamespacePrefix + '__' : '') + QueryResult.Name;
																																					var permpackagename = 'unpackaged/permissionsets/' + permname.replace(".", "%2E").replace("(", "%28").replace(")", "%29").replace("/", "%2F") + '.permissionset';
																																					if (zipresults.hasItem(permpackagename) == false && QueryResult.NamespacePrefix != undefined && QueryResult.NamespacePrefix.length > 0 )
																																					{
																																						permname = QueryResult.Name;
																																						permpackagename = 'unpackaged/permissionsets/' + permname.replace(".", "%2E").replace("(", "%28").replace(")", "%29").replace("/", "%2F") + '.permissionset';
																																					}

																																					if (zipresults.hasItem(permpackagename) == true)
																																					{
																																						var mydetail = zipresults.getItem(permpackagename);
																																						if (mydetail.PermissionSet.fieldPermissions != undefined)
																																						{
																																							for (var impf2 = 0; impf2 < mydetail.PermissionSet.fieldPermissions.length; impf2++)
																																							{
																																								var mypermission2 = mydetail.PermissionSet.fieldPermissions[impf2];
																																								SetFeildResult(mypermission2, QueryResult.Id, finalresult, QueryResult.Name, false);
																																							}
																																						}
																																						if (mydetail.PermissionSet.objectPermissions != undefined)
																																						{
																																							for (var impo2 = 0; impo2 < mydetail.PermissionSet.objectPermissions.length; impo2++)
																																							{
																																								var mypermission2 = mydetail.PermissionSet.objectPermissions[impo2];
																																								SetObjectResult(mypermission2, QueryResult.Id, finalresult, QueryResult.Name, false);
																																							}
																																						}
																																						if (mydetail.PermissionSet.recordTypeVisibilities)
																																						{
																																							for (var impr2 = 0; impr2 < mydetail.PermissionSet.recordTypeVisibilities.length; impr2++)
																																							{
																																								var myrtvis = mydetail.PermissionSet.recordTypeVisibilities[impr2];
																																								SetRecordTypeResult(myrtvis, QueryResult.Id, finalresult, QueryResult.Name, false);
																																							}
																																						}
																																						if (mydetail.PermissionSet.tabSettings)
																																						{
																																							for (var impt2 = 0; impt2 < mydetail.PermissionSet.tabSettings.length; impt2++)
																																							{
																																								var mytabvis = mydetail.PermissionSet.tabSettings[impt2];
																																								SetTabPermissionResult(mytabvis, QueryResult.Id, finalresult, QueryResult.Name, false);
																																							}
																																						}
																																					}
																																					else
																																					{
																																						console.log('Error Metadata not found for ' + permpackagename);
																																						alert('Error 99909');
																																					}
																																				}
																																			}
																																			ProcessFinalResult(finalresult, 2, function(result)
																																			{
																																				loadphase = 3
																																			    j$("#FXObjectPermissions").LoadingOverlay("hide", true);
																																			    j$("#Warnings").LoadingOverlay("hide", true);
																																			});
																																		}
																																	}
																																	catch (err)
																																	{
																																		console.log(err);
																																		ProcessError(err);
																																		throw err;
																																	}
																																});
																															}
																														}
																														catch (err)
																														{
																															console.log(err);
																															ProcessError(err);
																															throw err;
																														}
																													});
																												}
																											}
																											catch (err)
																											{
																												console.log(err);
																												ProcessError(err);
																												throw err;
																											}
																										});
																									}
																								}
																								catch (err)
																								{
																									console.log(err);
																									ProcessError(err);
																									throw err;
																								}
																							});
																						}
																					}
																					catch (err)
																					{
																						console.log(err);
																						ProcessError(err);
																						throw err;
																					}
																				});
																			}
																			catch (err)
																			{
																				console.log(err);
																				ProcessError(err);
																				throw err;
																			}
																		});
																	

																	}
																}
																catch (err)
																{
																	console.log(err);
																	ProcessError(err);
																	throw err;
																}
															});
														}
													}
													catch (err)
													{
														console.log(err);
														ProcessError(err);
														throw err;
													}
												});
											}
										}
										catch (err)
										{
											console.log(err);
											ProcessError(err);
											throw err;
										}
									});
								}
							}
							catch (err)
							{
								console.log(err);
								ProcessError(err);
								throw err;
							}
						});
					}
				}
				catch (err)
				{
					console.log(err);
					ProcessError(err);
					throw err;
				}
			});
		}
	}

	function doSoaplogin(user,pass, state)
	{
		j$("#MainDetail").LoadingOverlay("show",{image : "",fontawesome : fontawesomeloadIcon});
    	var myconnoptions = {oauth2: GetOauth(state)};
    	if (proxyurl)
		{
			myconnoptions.proxyUrl = proxyurl;
		}
    	conn = new jsforce.Connection(myconnoptions);
		conn.login(user, pass, function(err, userInfo)
		{
			if (err)
			{
				ProcessError(err);
        		window.location.replace(homeurl);
			}
			else
			{

				j$('#logindiv').hide();
        		//j$('#mainContent').show();
        		
		        myOrgId = userInfo.organizationId;
		        myuserid = userInfo.id;
				//mysessionId = conn.accessToken;
				if (conn.instanceUrl)
				{
					salesforceAccessURL = conn.instanceUrl + '/secur/frontdoor.jsp?sid=' + conn.accessToken + '&retURL='
				}
				/*
				if (targetUserId == undefined || targetUserId == null || targetUserId == '')
				{
					//setup for testing
					targetUserId = userInfo.id;
				}
				*/
        		CheckAccessAndSetup();
			}
		});
	}

	function getParameterName(name) 
	{
	    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	function GetOauth(state2)
	{
		var oauth2Options = 
		{
		    clientId: clientId,
		    clientSecret: clientSecret,
		    redirectUri: redirectUri
		};

		if (proxyurl)
		{
			oauth2Options.proxyUrl = proxyurl;
		}
		
		var myloginUrl;
		if (state2)
		{
			if (state2 == 'Sandbox')
			{
				myloginUrl = 'https://test.salesforce.com';
			}
			else
			{
				myloginUrl = 'https://login.salesforce.com';
			}
		}
		if (myloginUrl)
		{
			oauth2Options.loginUrl = myloginUrl;
		}
		return new jsforce.OAuth2(oauth2Options);
	}

	function ProcessFinalResult(result, pass, callback)
	{
		console.log(result);
		
		RemoteGetObjectInfoResult = result;
		if (pass == 1)
		{
			if (result.Userdetail != undefined)
			{
				var sfurl = '/' + result.Userdetail.Id + '?noredirect=1&isUserEntityOverride=1';
				if (salesforceAccessURL != '')
				{
					sfurl = salesforceAccessURL + encodeURIComponent(sfurl);
				}
				j$('#userFullName').html('<a href="' + sfurl + '" target="_blank">' + result.Userdetail.Name + '</a>');
				if (result.Userdetail.UserRole != undefined)
				{
					j$('#userRole').html(result.Userdetail.UserRole.Name);
				}
				if (result.Userdetail.Profile != undefined)
				{
					sfurl = '/' + result.Userdetail.Profile.Id;
					if (salesforceAccessURL != '')
					{
						sfurl = salesforceAccessURL + encodeURIComponent(sfurl);
					}
					j$('#userProfileName').html('<a href="'+ sfurl + '" target="_blank">' + result.Userdetail.Profile.Name + '</a>');
					if (result.Userdetail.Profile.UserLicense != undefined)
					{
						j$('#userProfileLicenseType').html(result.Userdetail.Profile.UserLicense.Name);
					}
				}
			}
			var datatablePermissionSetresult = '';
			if (result.PermissionSets != undefined)
			{
				datatablePermissionSetresult += '<table id="PermissionSetTable" class="table table-hover" cellspacing="0" width="100%"><thead><tr>';
				datatablePermissionSetresult += '<th>Name</th>';
				datatablePermissionSetresult += '<th>Description</th>';
				datatablePermissionSetresult += '<tbody>';
				j$.each(result.PermissionSets,function(index, d)
				{
					var sfurl = '/' + d.Id;
					if (salesforceAccessURL != '')
					{
						sfurl = salesforceAccessURL + encodeURIComponent(sfurl);
					}
					datatablePermissionSetresult += '<tr>';
					datatablePermissionSetresult += '<td><a href="'+sfurl+'" target="_blank">' + d.Label + '</a></td>';
					datatablePermissionSetresult += '<td>' + d.Description + '</td>';
					datatablePermissionSetresult += '</tr>';
				});
				datatablePermissionSetresult += '</tbody>';
				datatablePermissionSetresult += '</table>';
				j$('#FXPermissionSetTable').html(datatablePermissionSetresult);
			}
			
			var datatableApexClassesresult = '';
			if (result.ApexClassAccess != undefined)
			{
				datatableApexClassesresult += '<table id="ApexClassesTable" class="display" cellspacing="0" width="100%"><thead><tr>';
				datatableApexClassesresult += '<th>Name</th>';
				datatableApexClassesresult += '<th>Enabled</th>';
				datatableApexClassesresult += '</tr></thead>';
				datatableApexClassesresult += '<tbody>';
				j$.each(result.ApexClassAccess,function(index, d)
				{
					datatableApexClassesresult += '<tr>';
					datatableApexClassesresult += '<td>' + d.Label + '</td>';
					datatableApexClassesresult += '<td>' + GetSpanPermission(d.HasAccess, true, d.GrantedBy, null, 'ClassAccess') + '</td>'
					datatableApexClassesresult += '</tr>';
				});
				datatableApexClassesresult += '</tbody>';
				datatableApexClassesresult += '</table>';
				j$('#fxApexClassestable').html(datatableApexClassesresult);
				var actable = j$('#ApexClassesTable').DataTable(
				{
					"scrollCollapse": true,
					"paging": false,
					"order": [0, "asc"],
					"stateSave": true,
					"searching": true,
					"columnDefs": [
					{
						"targets": [1],
						"visible": true,
						"searchable": false,
						"orderDataType": "dom-checkbox-glyphicon"
					},
					{
						"targets": [0],
						"width": "350px"
					}]
				});
				actable.search('').columns().search('').draw();
			}
			var datatableVisualforcePagesresult = '';
			if (result.VFPageAccess != undefined)
			{
				datatableVisualforcePagesresult += '<table id="VisualforcePagesTable" class="display" cellspacing="0" width="100%"><thead><tr>';
				datatableVisualforcePagesresult += '<th>Name</th>';
				datatableVisualforcePagesresult += '<th>Enabled</th>';
				datatableVisualforcePagesresult += '</tr></thead>';
				datatableVisualforcePagesresult += '<tbody>';
				j$.each(result.VFPageAccess,function(index, d)
				{
					datatableVisualforcePagesresult += '<tr>';
					datatableVisualforcePagesresult += '<td>' + d.Label + '</td>';
					datatableVisualforcePagesresult += '<td>' + GetSpanPermission(d.HasAccess, true, d.GrantedBy, null, 'PageAccess') + '</td>'
					datatableVisualforcePagesresult += '</tr>';
				});
				datatableVisualforcePagesresult += '</tbody>';
				datatableVisualforcePagesresult += '</table>';
				j$('#fxVisualforcePagestable').html(datatableVisualforcePagesresult);
				var vptable = j$('#VisualforcePagesTable').DataTable(
				{
					"scrollCollapse": true,
					"paging": false,
					"order": [0, "asc"],
					"stateSave": true,
					"searching": true,
					"columnDefs": [
					{
						"targets": [1],
						"visible": true,
						"searchable": false,
						"orderDataType": "dom-checkbox-glyphicon"
					},
					{
						"targets": [0],
						"width": "350px"
					}]
				});
				vptable.search('').columns().search('').draw();
			}
			var datatableSystemPermissionsresult = '';
			if (result.SystemPermissions != undefined)
			{
				datatableSystemPermissionsresult += '<table id="SystemPermissionsTable" class="display" cellspacing="0" width="100%"><thead><tr>';
				datatableSystemPermissionsresult += '<th>Label</th>';
				datatableSystemPermissionsresult += '<th>Enabled</th>';
				datatableSystemPermissionsresult += '</tr></thead>';
				datatableSystemPermissionsresult += '<tbody>';
				j$.each(result.SystemPermissions,function(index, d)
				{
					datatableSystemPermissionsresult += '<tr>';
					datatableSystemPermissionsresult += '<td>' + d.Label + '</td>';
					datatableSystemPermissionsresult += '<td>' + GetSpanPermission(d.HasAccess, true, d.GrantedBy, null, 'SystemPermissions') + '</td>'
					datatableSystemPermissionsresult += '</tr>';
				});
				datatableSystemPermissionsresult += '</tbody>';
				datatableSystemPermissionsresult += '</table>';
				j$('#FXSystemPermissionsTable').html(datatableSystemPermissionsresult);
				//j$('[data-toggle="popover"]').popover({container: 'body'});  
				var sptable = j$('#SystemPermissionsTable').DataTable(
				{
					"scrollCollapse": true,
					"paging": false,
					"order": [0, "asc"],
					"stateSave": true,
					"searching": true,
					"columnDefs": [
					{
						"targets": [1],
						"visible": true,
						"searchable": false,
						"orderDataType": "dom-checkbox-glyphicon"
					},
					{
						"targets": [0],
						"width": "350px"
					}]
				});
				sptable.search('').columns().search('').draw();
			}
		}
		else if (pass == 2)
		{
			var datatableFXObjectsresult = '';
			if (result.FXObjects != undefined)
			{
				datatableFXObjectsresult += '<table id="FXObjectsTable" class="display" cellspacing="0" width="100%"><thead><tr>';
				datatableFXObjectsresult += '<th>Label</th>';
				datatableFXObjectsresult += '<th>API Name</th>';
				datatableFXObjectsresult += '<th>Tab Settings</th>';
				datatableFXObjectsresult += '<th>Read</th>';
				datatableFXObjectsresult += '<th>Create</th>';
				datatableFXObjectsresult += '<th>Edit</th>';
				datatableFXObjectsresult += '<th>Delete</th>';
				datatableFXObjectsresult += '<th>View All</th>';
				datatableFXObjectsresult += '<th>Modify All</th>';
				datatableFXObjectsresult += '<th>Field Count</th>';
				datatableFXObjectsresult += '<th>Field Read Access Count</th>';
				datatableFXObjectsresult += '<th>Field Edit Access Count</th>';
				datatableFXObjectsresult += '<th>Record Type Count</th>';
				datatableFXObjectsresult += '<th>Record Type Assigned Count</th>';
				datatableFXObjectsresult += '</tr></thead>';
				datatableFXObjectsresult += '<tbody>';
				j$.each(result.FXObjects,
					function(index, d)
					{
						datatableFXObjectsresult += '<tr>';
						datatableFXObjectsresult += '<td><a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;Top&apos;);">' + d.Label + '</a></td>';
						datatableFXObjectsresult += '<td><a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;Top&apos;);">' + d.APIName + '</a></td>';
						
						datatableFXObjectsresult += '<td>';
						if (d.TabPermissions && d.TabPermissions.length > 0)
						{
							var tabpermresult = 'None / Hidden';
							for (var it1 = 0; it1 < d.TabPermissions.length; it1++)
							{
								var tabperm = d.TabPermissions[it1];
								if (tabperm.Assigned == true)
								{
									tabpermresult = tabperm.Label;
								}
							}
							datatableFXObjectsresult += '<a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;TabSettings;&apos;);">' + tabpermresult + '</a>';
						}
						datatableFXObjectsresult += '</td>'

						datatableFXObjectsresult += '<td>' + GetSpanPermission(d.HasRead, true, d.HasReadGrantedBy, d, 'Object') + '</td>'
						datatableFXObjectsresult += '<td>' + GetSpanPermission(d.HasCreate, true, d.HasCreateGrantedBy, d, 'Object') + '</td>';
						datatableFXObjectsresult += '<td>' + GetSpanPermission(d.HasEdit, true, d.HasEditGrantedBy, d, 'Object') + '</td>';
						datatableFXObjectsresult += '<td>' + GetSpanPermission(d.HasDelete, true, d.HasDeleteGrantedBy, d, 'Object') + '</td>';
						datatableFXObjectsresult += '<td>' + GetSpanPermission(d.HasViewAll, true, d.HasViewAllGrantedBy, d, 'Object') + '</td>';
						datatableFXObjectsresult += '<td>' + GetSpanPermission(d.HasModifyAll, true, d.HasModifyAllGrantedBy, d, 'Object') + '</td>';
						var fc = GetFieldCount(d.fields, true, false, false);
						if (fc > 0)
						{
							datatableFXObjectsresult += '<td><a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;FieldPermissions&apos;);">' + GetFieldCount(d.fields, true, false, false) + '</a></td>';
							datatableFXObjectsresult += '<td><a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;FieldPermissions&apos;);">' + GetFieldCount(d.fields, false, true, false) + '</a></td>';
							datatableFXObjectsresult += '<td><a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;FieldPermissions&apos;);">' + GetFieldCount(d.fields, false, false, true) + '</a></td>';
						}
						else
						{
							datatableFXObjectsresult += '<td>0</td>';
							datatableFXObjectsresult += '<td>0</td>';
							datatableFXObjectsresult += '<td>0</td>';
						}
						var rt1 = GetRecordTypeCount(d.recordtypes, true) > 0 ? '<a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;RecordTypePermissions&apos;);">' + GetRecordTypeCount(d.recordtypes, true) + '</a>' :'0';
						var rt2 = GetRecordTypeCount(d.recordtypes, false) > 0 ? '<a onclick="ShowObjectModal(&apos;' + d.APIName + '&apos;,&apos;RecordTypePermissions&apos;);">' + GetRecordTypeCount(d.recordtypes, false) + '</a>' :'0';
						datatableFXObjectsresult += '<td>'+ rt1 + '</td>';
						datatableFXObjectsresult += '<td>'+ rt2 + '</td>';
						datatableFXObjectsresult += '</tr>';
					});
				datatableFXObjectsresult += '</tbody>';
				datatableFXObjectsresult += '</table>';
				j$('#fxobjectpermissiontable').html(datatableFXObjectsresult);
				var optable = j$('#FXObjectsTable').DataTable(
				{
					"scrollCollapse": true,
					"paging": false,
					"order": [0, "asc"],
					"stateSave": true,
					"searching": true,
					"columnDefs": [
					{
						"targets": [2, 3, 4, 5, 6, 7],
						"visible": true,
						"searchable": false,
						"orderDataType": "dom-checkbox-glyphicon"
					}]
				});
				optable.search('').columns().search('').draw();
			}
		
		}
		callback(true);
	}

	function FindFieldPermissions(sobject)
	{
		var result;
		if (RemoteGetObjectInfoResult != undefined)
		{
			if (RemoteGetObjectInfoResult.FXObjects != undefined)
			{
				j$.each(RemoteGetObjectInfoResult.FXObjects,
					function(index, d)
					{
						if (d.APIName == sobject)
						{
							result = d.fields;
						}
					}
				);
			}
		}
		return result;
	}

	function FindSobject(results, sobject)
	{
		var result;
		if (results != undefined)
		{
			if (results.FXObjects != undefined)
			{
				j$.each(results.FXObjects,
					function(index, d)
					{
						if (d.APIName == sobject)
						{
							result = d;
						}
					}
				);
			}
		}
		return result;
	}

	function FindRTPermissions(sobject)
	{
		var result;
		if (RemoteGetObjectInfoResult != undefined)
		{
			if (RemoteGetObjectInfoResult.FXObjects != undefined)
			{
				j$.each(RemoteGetObjectInfoResult.FXObjects,
					function(index, d)
					{
						if (d.APIName == sobject)
						{
							result = d.recordtypes;
						}
					}
				);
			}
		}
		return result;
	}
	
	function CurrentUserHasModifyAllDataAccess(tid, callback)
	{
		var myquery = "select Id, UserName, UserRole.Name, UserRoleId,Name,ProfileId,Profile.PermissionsModifyAllData from User where id ='" + tid + "'";
		var HasModifyAllDataAccess = false; // this is needed to access the metadata api
		QueryRecords(conn, myquery, function(UserQueryerr, UserQueryResults)
		{
			if (UserQueryerr)
			{
				callback('Error:' + UserQueryerr, null,null)
			}
			var myUser = UserQueryResults[0];
			var HasModifyAllDataAccess = myUser.Profile.PermissionsModifyAllData;
			if (HasModifyAllDataAccess == true)
			{
				callback(null, true,myUser);
			}
			else
			{
				myquery = "select Id, PermissionsModifyAllData from PermissionSet where IsOwnedByProfile = false and Id in (SELECT PermissionSetId FROM PermissionSetAssignment where AssigneeId = '" + tid + "')";
				QueryRecords(conn, myquery, function(PermissionSetQueryerr, PermissionSetQueryResults)
				{
					if (PermissionSetQueryerr)
					{
						callback('Error:' + PermissionSetQueryerr, null,null)
					}
					else
					{
						//console.log(PermissionSetQueryResults);
						if (PermissionSetQueryResults != undefined)
						{
							for (var i = 0; i < PermissionSetQueryResults.length; i++)
							{
								var QueryResult = PermissionSetQueryResults[i];
								if (QueryResult.PermissionsModifyAllData == true)
								{
									HasModifyAllDataAccess = true;
									//callback(null,true);
									break;
								}
							}
						}
						callback(null, HasModifyAllDataAccess,myUser);
					}
				});
			}
		});
	}

	function SetObjectResult(mypermission, myProfieePermSerId, fresult, proPermName, IsProfile)
	{
		try
		{
			var sobjectname = mypermission.object;
			for (var i2 = 0; i2 < fresult.FXObjects.length; i2++)
			{
				var myresultobject = fresult.FXObjects[i2];
				if (myresultobject.APIName == sobjectname)
				{
					if (mypermission.allowCreate == 'true')
					{
						myresultobject.HasCreate = true;
						myresultobject.HasCreateGrantedBy.push(
						{
							Id: myProfieePermSerId,
							IsProfile: IsProfile,
							Name: proPermName
						});
					}
					if (mypermission.allowDelete == 'true')
					{
						myresultobject.HasDelete = true;
						myresultobject.HasDeleteGrantedBy.push(
						{
							Id: myProfieePermSerId,
							IsProfile: IsProfile,
							Name: proPermName
						});
					}
					if (mypermission.allowEdit == 'true')
					{
						myresultobject.HasEdit = true;
						myresultobject.HasEditGrantedBy.push(
						{
							Id: myProfieePermSerId,
							IsProfile: IsProfile,
							Name: proPermName
						});
					}
					if (mypermission.allowRead == 'true')
					{
						myresultobject.HasRead = true;
						myresultobject.HasReadGrantedBy.push(
						{
							Id: myProfieePermSerId,
							IsProfile: IsProfile,
							Name: proPermName
						});
					}
					if (mypermission.modifyAllRecords == 'true')
					{
						myresultobject.HasModifyAll = true;
						myresultobject.HasModifyAllGrantedBy.push(
						{
							Id: myProfieePermSerId,
							IsProfile: IsProfile,
							Name: proPermName
						});
					}
					if (mypermission.viewAllRecords == 'true')
					{
						myresultobject.HasViewAll = true;
						myresultobject.HasViewAllGrantedBy.push(
						{
							Id: myProfieePermSerId,
							IsProfile: IsProfile,
							Name: proPermName
						});
					}
					break;
				}
			}
		}
		catch (err)
		{
			console.log(err);
			throw err;
		}
	}

	function SetTabPermissionResult(mypermission, myProfieePermSerId, fresult, proPermName, IsProfile)
	{
		try
		{
			var sobjectname = mypermission.tab;
			if (sobjectname.startsWith('standard-'))
			{
				sobjectname = sobjectname.substring(9);
			}
			var vis = '';
			if (mypermission.visibility == 'None' || mypermission.visibility == 'Hidden')
			{
				vis = 'NoneHidden';
			}
			else if (mypermission.visibility == 'DefaultOff' || mypermission.visibility == 'Available')
			{
				vis = 'DefaultOffAvailable';
			}
			else if (mypermission.visibility == 'DefaultOn' || mypermission.visibility == 'Visible')
			{
				vis = 'DefaultOnVisible';
			}

			if (vis != '')
			{
				for (var if1 = 0; if1 < fresult.FXObjects.length; if1++)
				{
					var myresultsobject = fresult.FXObjects[if1];
					if (myresultsobject.APIName == sobjectname)
					{
						for (var mt1 = 0; mt1 < myresultsobject.TabPermissions.length; mt1++)
						{
							var myresultobject = myresultsobject.TabPermissions[mt1];
							if (myresultobject.Name == vis)
							{
								myresultobject.Assigned = true;
								myresultobject.AssignedGrantedBy.push(
								{
									Id: myProfieePermSerId,
									IsProfile: IsProfile,
									Name: proPermName
								});
								break;
							}
						}
						break;
					}
				}
			}
		}
		catch (err)
		{
			console.log(err);
			//console.log(mypermission);
			throw err;
		}
	}

	function SetRecordTypeResult(mypermission, myProfieePermSerId, fresult, proPermName, IsProfile)
	{
		try
		{
			var sobjectraw = mypermission.recordType;
			var sobjectname = sobjectraw.substring(0, sobjectraw.indexOf("."));
			var sobjectrt = sobjectraw.substring(sobjectraw.indexOf(".") + 1);
			for (var i2 = 0; i2 < fresult.FXObjects.length; i2++)
			{
				var myresultsobject = fresult.FXObjects[i2];
				if (myresultsobject.APIName == sobjectname)
				{
					for (var i3 = 0; i3 < myresultsobject.recordtypes.length; i3++)
					{
						var myresultobject = myresultsobject.recordtypes[i3];
						if (myresultobject.Name == sobjectrt)
						{
							if (mypermission.visible == 'true')
							{
								
								myresultobject.Assigned = true;
								myresultobject.AssignedGrantedBy.push(
								{
									Id: myProfieePermSerId,
									IsProfile: IsProfile,
									Name: proPermName
								});
							}
							if (IsProfile == true && mypermission.default == 'true')
							{
								SetMasterRecordTypeToFalse(myresultsobject.recordtypes);
								myresultobject.Default = true;
								myresultobject.DefaultGrantedBy.push(
								{
									Id: myProfieePermSerId,
									IsProfile: IsProfile,
									Name: proPermName
								});
							}
							break;
						}
					}
					break;
				}
			}
		}
		catch (err)
		{
			console.log(err);
			//console.log(mypermission);
			throw err;
		}
	}

	function SetMasterRecordTypeToFalse(sobjectRecordtypes)
	{
		for (var i3 = 0; i3 < sobjectRecordtypes.length; i3++)
		{
			var myresultobject = sobjectRecordtypes[i3];
			if (myresultobject.Name == '--Master--')
			{
				myresultobject.Assigned = false;
				myresultobject.AssignedGrantedBy = [];
				myresultobject.Default = false;
				myresultobject.DefaultGrantedBy = [];
				break;
			}
		}
	}

	function SetFeildResult(mypermission, myProfieePermSerId, fresult, proPermName, IsProfile)
	{
		try
		{
			var sobjectraw = mypermission.field;
			var sobjectname = sobjectraw.substring(0, sobjectraw.indexOf("."));
			var sobjectfield = sobjectraw.substring(sobjectraw.indexOf(".") + 1);
			//console.log(sobjectname + ' |' + sobjectfield);
			for (var i2 = 0; i2 < fresult.FXObjects.length; i2++)
			{
				var myresultsobject = fresult.FXObjects[i2];
				if (myresultsobject.APIName == sobjectname)
				{
					for (var i3 = 0; i3 < myresultsobject.fields.length; i3++)
					{
						var myresultobject = myresultsobject.fields[i3];
						if (myresultobject.Name == sobjectfield)
						{
							if (mypermission.readable == 'true')
							{
								myresultobject.HasRead = true;
								myresultobject.HasReadGrantedBy.push(
								{
									Id: myProfieePermSerId,
									IsProfile: IsProfile,
									Name: proPermName
								});
							}
							if (mypermission.editable == 'true')
							{
								myresultobject.HasEdit = true;
								myresultobject.HasEditGrantedBy.push(
								{
									Id: myProfieePermSerId,
									IsProfile: IsProfile,
									Name: proPermName
								});
							}
							break;
						}
					}
					break;
				}
			}
		}
		catch (err)
		{
			console.log(err);
			//console.log(mypermission);
			throw err;
		}
	}

	function AddZipContentsToHashTableAsJson(data, callback)
	{
		var batchs = [];
		var results = new HashTable();
		var new_zip = new JSZip();
		var errorhasoccured = false;
		new_zip.loadAsync(data,
			{
				base64: true
			})
			.then(function(zip)
			{
				j$.each(new_zip.files, function(index, zipEntry)
				{
					batchs.push(zipEntry.name);
				});
				j$.each(new_zip.files, function(index, zipEntry)
				{
					ReadFileToString(new_zip, zipEntry.name, function(err, path, result)
					{
						if (result == undefined || result == null || err)
						{
							callback('Bad Data in File: ' + path, null);
						}
						var mybatchindex = batchs.indexOf(path);
						if (mybatchindex < 0)
						{
							errorhasoccured = true;
							callback('batch not found!', null);
						}
						batchs.splice(mybatchindex, 1);
						var x2js = new X2JS();
						var jsonresult = x2js.xml_str2json(result);
						results.setItem(path, jsonresult);
						if (batchs.length == 0)
						{
							if (errorhasoccured == false)
							{
								callback(null, results);
							}
						}
					});
				});
			});
	}

	function ReadFileToString(myzip, mypath, callback)
	{
		var rawdata = myzip.file(mypath).async("string")
			.then(function(data)
			{
				callback(null, mypath, data);
			});
	}

	function MetaDataApiName(profilename)
	{
		var standardprofiledict = new HashTable();
		standardprofiledict.setItem("System Administrator", "Admin");
		standardprofiledict.setItem("Standard User", "Standard");
		standardprofiledict.setItem("Marketing User", "MarketingProfile");
		standardprofiledict.setItem("Contract Manager", "ContractManager");
		standardprofiledict.setItem("Solution Manager", "SolutionManager");
		standardprofiledict.setItem("Read Only", "ReadOnly");
		standardprofiledict.setItem("Customer Portal Manager", "CustomerManager");
		standardprofiledict.setItem("Customer Portal User", "CustomerUser");
		standardprofiledict.setItem("High Volume Customer Portal", "HighVolumePortal");
		standardprofiledict.setItem("Partner User", "Partner");
		standardprofiledict.setItem("Authenticated Website", "PlatformPortal");
		standardprofiledict.setItem("Standard Platform User", "StandardAul");
		standardprofiledict.setItem("Standard Guest", "Guest");
		if (standardprofiledict.hasItem(profilename))
		{
			return standardprofiledict.getItem(profilename);
		}
		return profilename;
	}

	function ProcessError(error)
	{
		alert(error);
	}

	function GetFieldResults(item)
	{
		var fieldresults = [];
		var myfields = GetDescribeSObjectField(item.fields);
		for (var i = 0; i < myfields.length; i++)
		{
			var field = myfields[i];
			var HasEdit = false;
			var HasRead = false;
			var EditIsAssignable = true;
			var ReadIsAssignable = true;
			if (field.required == 'true' || field.type == 'MasterDetail' || field.type == 'AutoNumber')
			{
				HasEdit = true;
				HasRead = true;
				EditIsAssignable = false;
				ReadIsAssignable = false;
			}
			if (field.formula != undefined)
			{
				HasEdit = true;
				EditIsAssignable = false;
			}
			var flabel = field.label != undefined ? field.label : field.fullName;
			var fieldresult = {
				EditIsAssignable: EditIsAssignable,
				HasEdit: HasEdit,
				HasEditGrantedBy: [],
				HasRead: HasRead,
				HasReadGrantedBy: [],
				Label: flabel,
				Name: field.fullName,
				ReadIsAssignable: ReadIsAssignable,
				autoNumber: field.type == 'AutoNumber',
				calculated: field.formula != undefined,
				permissionable: true,
				FieldDescribe: field
			};
			fieldresults.push(fieldresult);
		}
		return fieldresults;
	}

	function GetRecordTypeResults(item,userProfileId, profilename)
	{
		var recordtyperesults = [];
		if (item.recordTypes)
		{
			if (item.fullName.endsWith('__c'))
			{
				var recordtyperesult = {
					Default: true,
					DefaultGrantedBy: [{Id: userProfileId,IsProfile: true,Name: profilename}],
					Assigned: true,
					AssignedGrantedBy: [{Id: userProfileId,IsProfile: true,Name: profilename}],
					Label: '--Master--',
					Name: '--Master--'
				};
				recordtyperesults.push(recordtyperesult);
			}
			if (Array.isArray(item.recordTypes))
			{
				for (var i = 0; i < item.recordTypes.length; i++)
				{
					var recordtype = item.recordTypes[i];
					if (recordtype.active == 'true')
					{
						var flabel = recordtype.label != undefined ? recordtype.label : recordtype.fullName;
						var recordtyperesult = {
							Default: false,
							DefaultGrantedBy: [],
							Assigned: false,
							AssignedGrantedBy: [],
							Label: flabel,
							Name: recordtype.fullName,
							RecordTypeDescribe: recordtype
						};
						recordtyperesults.push(recordtyperesult);
					}
				}
			}
			else
			{
				var recordtype = item.recordTypes;
				if (recordtype.active == 'true')
				{
					var flabel = recordtype.label != undefined ? recordtype.label : recordtype.fullName;
					var recordtyperesult = {
						Default: false,
						DefaultGrantedBy: [],
						Assigned: false,
						AssignedGrantedBy: [],
						Label: flabel,
						Name: recordtype.fullName,
						RecordTypeDescribe: recordtype
					};
					recordtyperesults.push(recordtyperesult);
				}
			}
		}
		return recordtyperesults;
	}

	function GetTabResults(item)
	{
		var tabresults = [];
		var starndardtabs = ['Account','Contact','User']
		if (item.CusomTab || starndardtabs.indexOf(item.fullName) >= 0)
		{
			var tabresult = {
				Assigned: false,
				AssignedGrantedBy: [],
				Label: 'None / Hidden',
				Name: 'NoneHidden',
			};
			tabresults.push(tabresult);
			var tabresult = {
				Assigned: false,
				AssignedGrantedBy: [],
				Label: 'DefaultOff / Available',
				Name: 'DefaultOffAvailable',
			};
			tabresults.push(tabresult);
			var tabresult = {
				Assigned: false,
				AssignedGrantedBy: [],
				Label: 'DefaultOn / Visible',
				Name: 'DefaultOnVisible',
			};
			tabresults.push(tabresult);
		}
		return tabresults;
	}

	function GetDescribeSObjectField(fields)
	{
		var results = [];
		if (fields != undefined && Array.isArray(fields))
		{
			j$.each(fields, function(index, field)
			{
				results.push(field);
			});
		}
		else if (fields != undefined)
		{
			results.push(fields);
		}
		return results;
	}

	function QueryRecords(conn, myquery, callback)
	{
		var records = [];
		var query = conn.query(myquery)
			.on("record", function(record)
			{
				records.push(record);
				//console.log(record);
			})
			.on("end", function()
			{
				callback(null, records);
				//console.log("total in database : " + query.totalSize);
				//console.log("total fetched : " + query.totalFetched);
			})
			.on("error", function(err)
			{
				//console.error(err);
				callback(err, null);
			})
			.run(
			{
				autoFetch: true,
				maxFetch: 4000
			}); //
	}

	function QueryToolingRecords(conn, myquery, callback)
	{
		var records = [];
		var query = conn.tooling.query(myquery)
			.on("record", function(record)
			{
				records.push(record);
				//console.log(record);
			})
			.on("end", function()
			{
				callback(null, records);
				//console.log("total in database : " + query.totalSize);
				//console.log("total fetched : " + query.totalFetched);
			})
			.on("error", function(err)
			{
				//console.error(err);
				callback(err, null);
			})
			.run(
			{
				autoFetch: true,
				maxFetch: 4000
			}); // synonym of Query#execute();
	}

	function DocheckRetrieveStatus(conn, id, callback)
	{
		conn.metadata.checkRetrieveStatus(id, function(err, result)
		{
			if (err)
			{
				callback(err, result);
			}
			else if (result.done == 'false')
			{
				console.log('Metadata API Retrieve Status: ' + result.status);
				setTimeout(function()
				{
					DocheckRetrieveStatus(conn, id, callback);
				}, 5000);
			}
			else if (result.done == 'true')
			{
				callback(err, result);
			}
		});
	}

	function GetAllCustomObject(conn, callback)
	{
		var lstquery = [
		{
			type: 'CustomObject'
		}];
		conn.metadata.list(lstquery, jsforceAPIVersion, function(err, metadata)
		{
			if (err)
			{
				callback(err, null);
			}
			else
			{
				var fullNames = [];
				for (var i = 0; i < metadata.length; i++)
				{
					var meta = metadata[i];
					fullNames.push(meta.fullName);
				}
				callback(null, fullNames);
			}
		});
	}

	function GetAllCustomTabs(conn, callback)
	{
		var lstquery = [
		{
			type: 'CustomTab'
		}];
		conn.metadata.list(lstquery, jsforceAPIVersion, function(err, metadata)
		{
			if (err)
			{
				callback(err, null);
			}
			else
			{
				/*
				var fullNames = [];
				for (var i = 0; i < metadata.length; i++)
				{
					var meta = metadata[i];
					fullNames.push(meta.fullName);
				}
				*/
				callback(null, metadata);
			}
		});
	}

	function DescribeAllSObjects(conn, callback)
	{
		GetAllCustomObject(conn, function(err, fullNames)
		{
			if (err)
			{
				callback(err, null);
			}
			else
			{
				var results = [];
				DescribeAllSObjects2(conn, results, 10, '', fullNames, function(err, result)
				{
					if (err && !result)
					{
						callback(err, null);
					}
					else
					{
						var missing = [];
						var found = [];
						if (result != undefined)
						{
							for (var i = 0; i < result.length; i++)
							{
								found.push(result[i].fullName);
							}
						}
						for (var i = 0; i < fullNames.length; i++)
						{
							if (found.indexOf(fullNames[i]) < 0)
							{
								missing.push(fullNames[i]);
							}
						}
						if (missing.length > 0)
						{
							console.log('Missing DescribeAllSObjects Objects:' + missing);
						}
						for (var i = 0; i < result.length; i++)
						{
							result[i].IsCustomTab = false;
							result[i].OneFieldIsPermissionable = true;
							result[i].IsPermissionable = true;
							result[i].isCustomSetting = false;
							if (result[i].fullName == 'User')
							{
								result[i].IsPermissionable = false;
							}
							if (result[i].customSettingsType)
							{
								result[i].isCustomSetting = true;
								result[i].IsPermissionable = false;
								result[i].OneFieldIsPermissionable = false;
							}
						}
						QueryToolingRecords(conn, 'Select Id, DeveloperName, NamespacePrefix From CustomObject', function(toolingerr, toolingresult)
						{
							if (toolingerr)
							{
								callback(toolingerr, null);
							}
							else
							{
								if (toolingresult)
								{
									j$.each(toolingresult, function(index, tr)
									{
										var objname = (tr.NamespacePrefix != undefined && tr.NamespacePrefix != null ? tr.NamespacePrefix + '__' : '') + tr.DeveloperName;
										for (var i = 0; i < result.length; i++)
										{
											if (result[i].fullName == objname || result[i].fullName == objname + '__c')
											{
												result[i].CusomObjectId = tr.Id;
												break;
											}
										}
									});
								}
								GetAllCustomTabs(conn, function(taberr, tabsresult)
								{
									if (taberr)
									{
										callback(tBerr, null);
									}
									else
									{

										var tabnames = [];
										j$.each(tabsresult, function(index, tab)
										{
											var objname = tab.fullName;
											tabnames.push(objname);
											if (objname.startsWith('standard-'))
											{
												objname = objname.substring(10);
											}
											var tabfound = false;
											for (var i = 0; i < result.length; i++)
											{
												if (result[i].fullName == objname)
												{
													result[i].CusomTab = tab;
													tabfound = true;
													break;
												}
											}
											if (tabfound == false)
											{
												//tab only
												var ctab = {IsCustomTab:true,CusomObjectId: tab.id,CusomTab:tab,label:tab.label,fullName:tab.fullName,fields:[],OneFieldIsPermissionable:false,isCustomSetting:false,recordtypes:[],IsPermissionable: false};
												result.push(ctab);
											}
										});

										callback(missing.length > 0 ? err : null, result, tabnames);
									}
								});
							}
						});
					}
				});
			}
		});
	}

	function DescribeAllSObjects2(conn, metaresults, chunksize, errors, fullNames, callback)
	{
		ReadMetaData(conn, 'CustomObject', fullNames, chunksize, errors, function(err, erroronnames, result)
		{
			if (result)
			{
				if (Array.isArray(result))
				{
					for (var i2 = 0; i2 < result.length; i2++)
					{
						metaresults.push(result[i2]);
					}
				}
				else
				{
					metaresults.push(result);
				}
			}
			if (err && chunksize > 1 && erroronnames && erroronnames.length > 0)
			{
				if (errors != '')
				{
					errors += ' | ';
				}
				errors += err + ' | RETYING DESCRIBE FOR OBJECTS ONE AT A TIME! |';
				//somthing with wrong lets try one at a time to find the culprit
				DescribeAllSObjects2(conn, metaresults, 1, errors, erroronnames, callback);
			}
			else
			{
				callback(err, metaresults.length > 0 ? metaresults : null);
			}
		});
	}

	function ChunkArrayInGroups(array, unit)
	{
		var results = [],
			length = Math.ceil(array.length / unit);
		for (var i = 0; i < length; i++)
		{
			results.push(array.slice(i * unit, (i + 1) * unit));
		}
		return results;
	}

	function ReadMetaData(conn, type, names, chunksize, errors, callback)
	{
		var batchs = [];
		var metaresults2 = [];
		var errorhasoccured = false;
		var smallarrays = ChunkArrayInGroups(names, chunksize);
		if (smallarrays.length > 0)
		{
			for (var i = 0; i < smallarrays.length; i++)
			{
				batchs.push(i);
			}
			var erroronnames = [];
			//var errors = '';
			for (var i = 0; i < smallarrays.length; i++)
			{
				ReadMetaDataPart(conn, i, type, smallarrays[i], function(err, batch, returntype, returnNames, returnValue)
				{
					if (err)
					{
						if (returnNames != undefined)
						{
							for (var i3 = 0; i3 < returnNames.length; i3++)
							{
								erroronnames.push(returnNames[i3]);
							}
						}
						if (errors != '')
						{
							errors += ' | ';
						}
						errors += err;
					}
					if (returnValue != undefined)
					{
						if (Array.isArray(returnValue))
						{
							for (var i2 = 0; i2 < returnValue.length; i2++)
							{
								metaresults2.push(returnValue[i2]);
							}
						}
						else
						{
							metaresults2.push(returnValue);
						}
					}
					var mybatchindex = batchs.indexOf(batch);
					if (mybatchindex < 0)
					{
						errorhasoccured = true;
						callback('batch not found!', errors, null, null);
					}
					else
					{
						batchs.splice(mybatchindex, 1);
						if (batchs.length == 0)
						{
							callback(errors != '' ? errors : null, erroronnames.length > 0 ? erroronnames : null, metaresults2);
						}
					}
				});
			}
		}
	}

	function ReadMetaDataPart(conn, batch, type, names, callback)
	{
		//var conn = new jsforce.Connection({accessToken : '{!$Api.Session_ID}'});
		conn.metadata.read(type, names, function(err, metadata)
		{
			if (err)
			{
				callback(err + " ReadMetaDataPart Error Details: type: " + type + " names: " + names, batch, type, names, null);
			}
			else
			{
				//var result = {batch:batch, error:err, metadata:metadata};
				callback(null, batch, type, names, metadata);
			}
		});
	}

	

	function GetFieldCount(fields, all, read, edit)
	{
		var i = 0;
		j$.each(fields,
			function(i2, f)
			{
				if (all == true)
				{
					i++;
				}
				else if (read == true && f.HasRead)
				{
					i++;
				}
				else if (edit == true && f.HasEdit)
				{
					i++;
				}
			}
		);
		return i;
	}

	function GetRecordTypeCount(fields, all)
	{
		var i = 0;
		if (fields)
		{
			j$.each(fields,
				function(i2, f)
				{
					if (all == true)
					{
						i++;
					}
					else if (f.Assigned)
					{
						i++;
					}
				}
			);
		}
		return i;
	}

	function GetSpanPermission(hasaccess, ispermissionable, grantedby, CusomObject, sftype)
	{
		var results = '';
		if (sftype == 'Object' && CusomObject.IsPermissionable == false)
		{
			return results;
		}
		results += '<div class="dropdown">';
		results += ' <span class="glyphicon ' + (hasaccess == true ? 'glyphicon-check dropdown-toggle' : 'glyphicon-unchecked') + ' ' + (ispermissionable == false ? 'text-grey' : '') + '" data-checked="' + hasaccess + '" type="button" data-toggle="dropdown"></span>';
		if (hasaccess == true && grantedby && grantedby.length > 0 && ispermissionable)
		{
			results += '<ul class="dropdown-menu">';
			results += '<li role="presentation"><p style="text-align: center;font-weight: bold;" role="menuitem" tabindex="-1">Assigned From</p></li>';
			results += '<li role="presentation" class="divider"></li>';
			var gresults = '';
			j$.each(grantedby,
				function(i2, ri)
				{
					var myname = (ri.IsProfile ? '*' : '') + ri.Name;
					var mysobjectId = '';
					var mysobjectId = (CusomObject != undefined && CusomObject.CusomObjectId != undefined && CusomObject.CusomObjectId != null ? CusomObject.CusomObjectId.substring(0, 15) : '');
					if (mysobjectId == '' && CusomObject != undefined && CusomObject.APIName != undefined && CusomObject.APIName != null)
					{
						mysobjectId = CusomObject.APIName;
					}
					var sfurl = '';
					if (sftype == 'Field')
					{
						var urlSValue = (ri.IsProfile == true ? 'ObjectsAndTabs' : 'EntityPermissions');
						sfurl = "/" + ri.Id.substring(0, 15) + "?s=" + urlSValue + "&o=" + mysobjectId;
					}
					else if (sftype == 'SystemPermissions')
					{
						sfurl = "/" + ri.Id.substring(0, 15) + "?s=SystemPermissions";
					}
					else if (sftype == 'ClassAccess')
					{
						sfurl = "/" + ri.Id.substring(0, 15) + "?s=ClassAccess";
					}
					else if (sftype == 'PageAccess')
					{
						sfurl = "/" + ri.Id.substring(0, 15) + "?s=PageAccess";
					}
					else
					{
						sfurl = "/" + ri.Id.substring(0, 15);
					}
					if (salesforceAccessURL != '')
					{
						sfurl = salesforceAccessURL + encodeURIComponent(sfurl);
					}
					results += '<li><font style="text-decoration: underline;hover: #008CBA;"><a href="' + sfurl + '"" target="_blank">' + myname + '</a></font></li>';
				});
			results += '</ul>';
		}
		results += '</div>';
		results += '</div>';
		return results;
	}

	function HashTable()
	{
		this.length = 0;
		this.items = new Array();
		this.keys = new Array();
		for (var i = 0; i < arguments.length; i += 2)
		{
			if (typeof(arguments[i + 1]) != 'undefined')
			{
				this.items[arguments[i]] = arguments[i + 1];
				this.length++;
			}
		}
		this.removeItem = function(in_key)
		{
			var tmp_previous;
			if (typeof(this.items[in_key]) != 'undefined')
			{
				this.length--;
				var tmp_previous = this.items[in_key];
				delete this.items[in_key];
			}
			if (this.keys.indexOf(in_key) >= 0)
			{
				this.keys.splice(this.keys.indexOf(in_key), 1);
			}
			return tmp_previous;
		}
		this.getItem = function(in_key)
		{
			return this.items[in_key];
		}
		this.getItemAt = function(index_key)
		{
			return this.items[index_key];
		}
		this.setItem = function(in_key, in_value)
		{
			var tmp_previous;
			if (typeof(in_value) != 'undefined')
			{
				if (typeof(this.items[in_key]) == 'undefined')
				{
					this.length++;
				}
				else
				{
					tmp_previous = this.items[in_key];
				}
				if (this.keys.indexOf(in_key) < 0)
				{
					this.keys.push(in_key);
				}
				this.items[in_key] = in_value;
			}
			return tmp_previous;
		}
		this.hasItem = function(in_key)
		{
			return typeof(this.items[in_key]) != 'undefined';
		}
		this.clear = function()
		{
			for (var i in this.items)
			{
				delete this.items[i];
			}
			this.length = 0;
			this.keys = [];
		}
	}

/******************END Support Functions *************************************/

