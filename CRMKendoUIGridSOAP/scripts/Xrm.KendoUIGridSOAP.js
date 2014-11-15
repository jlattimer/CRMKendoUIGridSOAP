//Remember everything needs to get uploaded to CRM as web resources to work

Xrm = window.Xrm || { __namespace: true };
Xrm.KendoUIGridSOAP = Xrm.KendoUIGridSOAP || { __namespace: true };

$(document).ready(function () {
    Xrm.KendoUIGridSOAP.CreateGrid();
});

Xrm.KendoUIGridSOAP.GetAccounts = function (page) {
    /// <summary>
    /// Executes the SOAP request to retrieve accounts from Dynamics CRM.
    /// </summary>
    /// <param name="page">The page number to retrieve.</param>
    /// <returns type="Object">JSON data consisting of results and total.</returns>

    page = (page == null) ? 1 : page;
    var response = {};
    response.data = {};
    response.data.results = [];
    response.data.total = null;

    //Create the RetrieveMultiple SOAP request
    var request = [];
    request.push("<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">");
    request.push("  <s:Body>");
    request.push("    <RetrieveMultiple xmlns=\"http://schemas.microsoft.com/xrm/2011/Contracts/Services\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\">");
    request.push("      <query i:type=\"a:QueryExpression\" xmlns:a=\"http://schemas.microsoft.com/xrm/2011/Contracts\">");
    request.push("        <a:ColumnSet>");
    request.push("          <a:AllColumns>false</a:AllColumns>");
    request.push("          <a:Columns xmlns:b=\"http://schemas.microsoft.com/2003/10/Serialization/Arrays\">");
    request.push("            <b:string>name</b:string>");
    request.push("            <b:string>accountnumber</b:string>");
    request.push("          </a:Columns>");
    request.push("        </a:ColumnSet>");
    request.push("        <a:Criteria>");
    request.push("          <a:Conditions>");
    request.push("            <a:ConditionExpression>");
    request.push("              <a:AttributeName>statuscode</a:AttributeName>");
    request.push("              <a:Operator>Equal</a:Operator>");
    request.push("              <a:Values xmlns:b=\"http://schemas.microsoft.com/2003/10/Serialization/Arrays\">");
    request.push("                <b:anyType i:type=\"c:int\" xmlns:c=\"http://www.w3.org/2001/XMLSchema\">1</b:anyType>");
    request.push("              </a:Values>");
    request.push("              <a:EntityName i:nil=\"true\" />");
    request.push("            </a:ConditionExpression>");
    request.push("          </a:Conditions>");
    request.push("          <a:FilterOperator>And</a:FilterOperator>");
    request.push("          <a:Filters />");
    request.push("        </a:Criteria>");
    request.push("        <a:Distinct>false</a:Distinct>");
    request.push("        <a:EntityName>account</a:EntityName>");
    request.push("        <a:LinkEntities />");
    request.push("        <a:Orders>");
    request.push("          <a:OrderExpression>");
    request.push("            <a:AttributeName>name</a:AttributeName>");
    request.push("            <a:OrderType>Ascending</a:OrderType>");
    request.push("          </a:OrderExpression>");
    request.push("        </a:Orders>");
    request.push("        <a:PageInfo>");
    request.push("          <a:Count>10</a:Count>");
    request.push("          <a:PageNumber>" + page + "</a:PageNumber>");
    request.push("          <a:PagingCookie i:nil=\"true\" />");
    request.push("          <a:ReturnTotalRecordCount>true</a:ReturnTotalRecordCount>");
    request.push("        </a:PageInfo>");
    request.push("        <a:NoLock>false</a:NoLock>");
    request.push("      </query>");
    request.push("    </RetrieveMultiple>");
    request.push("  </s:Body>");
    request.push("</s:Envelope>");

    var context = Xrm.KendoUIGridSOAP.GetContext();
    var req = new XMLHttpRequest();
    req.open("POST", encodeURI(context.getClientUrl() + "/XRMServices/2011/Organization.svc/web"), false);
    req.setRequestHeader("Accept", "application/xml, text/xml, */*");
    req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    req.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/RetrieveMultiple");
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            if (req.status === 200) {
                //Parse into XML and remove element namespaces to make navigation easier
                var doc = $.parseXML(req.responseText.replace(/<(\/?)([^:>\s]*:)?([^>]+)>/g, "<$1$3>")); 
                var accounts = $(doc).find("Entity");

                //Convert to JSON 
                for (var i = 0; i < accounts.length; i++) {
                    response.data.results.push({
                        "accountid": $(accounts[i]).find("Attributes > KeyValuePairOfstringanyType:contains('accountid') > value").text(),
                        "name": $(accounts[i]).find("Attributes > KeyValuePairOfstringanyType:contains('name') > value").text(),
                        "accountnumber": $(accounts[i]).find("Attributes > KeyValuePairOfstringanyType:contains('accountnumber') > value").text(),
                    });
                }

                var total = $(doc).find("TotalRecordCount").text();
                response.data.total = total;
            }
        }
    };
    req.send(request.join(""));

    return response;
};

Xrm.KendoUIGridSOAP.CreateGrid = function () {
    /// <summary>
    /// Generates the Kendo UI grid based on the retrieved accounts.
    /// </summary>

    $("#AccountsGrid").kendoGrid({
        dataSource: {
            transport: {
                read: function (options) {
                    //Get the results by page
                    var results = Xrm.KendoUIGridSOAP.GetAccounts(options.data.page);
                    options.success(results);
                }
            },
            schema: {
                data: "data.results",
                total: function (results) {
                    return results.data.total;
                }
            },
            pageSize: 10,
            serverPaging: true
        },
        height: 335,
        selectable: 'row',
        change: function (arg) {
            //Handle the row selection event
            $.map(this.select(), function (item) {
                alert($(item).find('td').eq(0).text());
            });
        },
        columns: [
            {
                field: "accountid",
                hidden: true
            }, {
                field: "name",
                title: "Name"
            }, {
                field: "accountnumber",
                title: "Account Number"
            }
        ],
        pageable: {
            buttonCount: 3
        }
    });
};

Xrm.KendoUIGridSOAP.GetContext = function () {
    /// <summary>
    /// Retrieves the CRM context information.
    /// </summary>
    /// <returns type="Object">The CRM context.</returns>

    var errorMessage = "Context is not available.";
    if (typeof GetGlobalContext != "undefined") {
        return GetGlobalContext();
    }
    else {
        if (typeof Xrm != "undefined") {
            return Xrm.Page.context;
        } else {
            throw new Error(errorMessage);
        }
    }
};