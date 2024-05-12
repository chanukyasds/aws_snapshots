$(document).ready(function() {
    var rowsPerPage = 10;
    var currentPage = 1; 
    $.getJSON('data.json', function(data) {
        populateTable(data);
        populateDbFilterOnly(data);
        populateServiceFilter(data);
        populateDbFilter(data, 'all');

        $('#dbFilter, #dateFilter').change(function() {
            applyFilters(data);
        });

        $('#serviceFilter').change(function() {
            var selectedService = $(this).val();
            populateDbFilter(data, selectedService);
            applyFilters(data);
        });

        $('#clearFilters').click(function() {
            $('#dbFilter').val('all');
            $('#dateFilter').val('');
            $('#serviceFilter').val('all');
            $('#textToCopy').val('');
            applyFilters(data);
        });

        $('#generateButton').click(function() {
            if ($('input[name="rowRadio"]:checked').length === 0) {
                alert("Please select a snapshot and click Generate Manifest.");
                return;
            }
            var selectedRow = $('input[name="rowRadio"]:checked').closest('tr');
            var snapshotID = selectedRow.find('td:nth-child(4)').text();
            var manifestContent = "instance_name: <<your_instance_name>>\n";
            manifestContent += "engine_version: <<your_engine_version>>\n";
            manifestContent += "tshirt_size: <<your_tshirt_size>>\n";
            manifestContent += "snapshot_id: " + snapshotID;
            $('#textToCopy').val(manifestContent);
        });

        $('#snapshotTable tbody').on('click', 'tr', function() {
            $('input[name="rowRadio"]').prop('checked', false);
            $(this).find('input[name="rowRadio"]').prop('checked', true);
        });

        updatePagination(data);
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Error loading JSON data:', textStatus, errorThrown);
    });
    
    function populateTable(data) {
        if ($.fn.DataTable.isDataTable('#snapshotTable')) {
            $('#snapshotTable').DataTable().destroy();
        }

        var table = $('#snapshotTable').DataTable({
            data: data,
            columns: [
                { data: null, defaultContent: '' },
                { data: 'Service', defaultContent: 'NoService' },
                { data: 'InstanceID' },
                { data: 'SnapshotID' },
                { data: 'CreationTime' },
                { data: 'Status' }
            ],
            columnDefs: [{
                targets: 0,
                orderable: false,
                searchable: false,
                render: function(data, type, row, meta) {
                    return '<input type="radio" name="rowRadio">';
                }
            }],
            order: [[4, 'desc']],
        });
    }

    function updatePagination(data) {
        var totalPages = Math.ceil(data.length / rowsPerPage);
        var paginationHtml = '';
        for (var i = 1; i <= totalPages; i++) {
            paginationHtml += '<button class="page-btn" data-page="' + i + '">' + i + '</button>';
        }
        $('#pagination').html(paginationHtml);
        $('.page-btn').click(function() {
            currentPage = parseInt($(this).attr('data-page'));
            populateTable(data);
        });
    }
    function populateDbFilterOnly(data) {
        var dbFilter = $('#dbFilter');
        dbFilter.empty();
        dbFilter.append('<option value="all">All</option>');

        var dbInstances = [];
        $.each(data, function(index, row) {
            if (!dbInstances.includes(row.InstanceID)) {
                dbInstances.push(row.InstanceID);
                dbFilter.append('<option value="' + row.InstanceID + '">' + row.InstanceID + '</option>');
            }
        });
    }
    function populateDbFilter(data, selectedService) {
        var dbFilter = $('#dbFilter');
        dbFilter.empty();
        dbFilter.append('<option value="all">All</option>');

        var dbInstances = [];
        $.each(data, function(index, row) {
            var eachService = row.Service ?? "NoService" ;
            if ((selectedService === 'all' || eachService === selectedService) && !dbInstances.includes(row.InstanceID)) {
                dbInstances.push(row.InstanceID);
                dbFilter.append('<option value="' + row.InstanceID + '">' + row.InstanceID + '</option>');
            }
        });
    }
    function populateServiceFilter(data) {
        var serviceFilter = $('#serviceFilter');
        serviceFilter.empty();
        serviceFilter.append('<option value="all">All</option>');

        var serviceList = [];
        $.each(data, function(index, row) {
            var ServiceName = row.Service ?? "NoService" ;
            if (!serviceList.includes(ServiceName)) {
                serviceList.push(ServiceName);
                serviceFilter.append('<option value="' + ServiceName + '">' + ServiceName + '</option>');
            }
        });
    }
    function applyFilters(data) {
        var service = $('#serviceFilter').val();
        var dbInstance = $('#dbFilter').val();
        var date = $('#dateFilter').val();
        var filteredData = data;
        if (service !== 'all') {
            filteredData = filteredData.filter(function(row) {
                var serviceName = row.Service ?? "NoService";
                return serviceName.toLowerCase() === service.toLowerCase();
            });
        }
        if (dbInstance !== 'all') {
            filteredData = filteredData.filter(function(row) {
                return row.InstanceID.toLowerCase() === dbInstance.toLowerCase();
            });
        }
        if (date) {
            filteredData = filteredData.filter(function(row) {
                return row.CreationTime.split('T')[0] === date;
            });
        }
        currentPage = 1; // Reset to first page when filters change
        updatePagination(filteredData);
        populateTable(filteredData);
    }

    $('#copyButton').click(function() {
        var textToCopy = $('#textToCopy').val();
        if (textToCopy.trim() === '') {
            alert("Please generate manifest first.");
            return;
        }
        $('#textToCopy').select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        showMessage("Manifest copied successfully!");
    });

    $('#downloadButton').click(function() {
        var textToCopy = $('#textToCopy').val();
        if (textToCopy.trim() === '') {
            alert("Please generate manifest first.");
            return;
        }
        var blob = new Blob([textToCopy], { type: 'text/yaml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'manifest.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage("Manifest downloaded successfully!");
    });

    function showMessage(message) {
        var messageElement = $('<div class="message">' + message + '</div>');
        $('#filters-container').after(messageElement);
        messageElement.css({
            'text-align': 'center',
            'margin-top': '20px',
            'background-color': '#007bff', 
            'color': '#fff',
            'padding': '10px 20px',
            'border-radius': '5px',
            'box-shadow': '0 0 10px rgba(0, 0, 0, 0.3)'
        });
        setTimeout(function() {
            messageElement.remove();
        }, 2000);
    }
    
    
});
